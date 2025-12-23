import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Innertube, UniversalCache } from 'youtubei.js';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TranscriptEntry {
    text: string;
    start: number;
    duration: number;
}

type ErrorType = 'VIDEO_UNAVAILABLE' | 'NO_CAPTIONS' | 'PARSING_ERROR' | 'NETWORK_ERROR' | 'UNKNOWN';

function createErrorResponse(message: string, type: ErrorType, details?: string, retryable: boolean = false, status: number = 400) {
    return new Response(
        JSON.stringify({
            error: message,
            errorType: type,
            details: details,
            retryable: retryable
        }),
        {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: status
        }
    );
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { videoId, languages: requestedLanguages = ['en'] } = await req.json();

        if (!videoId) {
            return createErrorResponse('Missing videoId', 'UNKNOWN', 'Please provide a valid YouTube video ID.');
        }

        console.log(`📹 Processing request for video: ${videoId}`);

        // Initialize Innertube with robust settings
        // Note: Using a common browser User-Agent can help with playability status
        const youtube = await Innertube.create({
            cache: new UniversalCache(false),
            generate_session_locally: true,
            fetch: (url, init) => {
                const headers = new Headers(init?.headers);
                headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
                return fetch(url, { ...init, headers });
            }
        });

        // Fetch video info with retry/fallback strategy
        let info;
        const strategies: any[] = ['WEB', 'ANDROID', 'IOS', 'MWEB'];
        let lastError = null;

        for (const strategy of strategies) {
            try {
                console.log(`Attempting to fetch video info (Strategy: ${strategy})...`);
                info = await youtube.getInfo(videoId, strategy);

                // If we got info, check if it has the playability status we need
                if (info.playability_status?.status === 'OK') {
                    console.log(`✅ Strategy ${strategy} succeeded!`);
                    break;
                } else {
                    console.warn(`⚠️ Strategy ${strategy} returned status: ${info.playability_status?.status}`);
                    // Continue to next strategy if this one is restricted but might be available on others
                }
            } catch (e: any) {
                console.warn(`❌ Strategy ${strategy} failed with error: ${e.message}`);
                lastError = e;
            }
        }

        if (!info) {
            throw new Error(`All fetching strategies failed. Last error: ${lastError?.message || 'Unknown'}`);
        }

        // Detailed playability check
        const pStatus = info.playability_status;
        console.log(`📡 Final Playability Status: ${pStatus?.status || 'UNKNOWN'}`);

        if (pStatus?.status !== 'OK') {
            const reason = pStatus?.reason || info.player_overlays?.reason || 'Video cannot be played (unplayable/private).';
            console.error(`❌ Video Unavailable (Status: ${pStatus?.status}): ${reason}`);

            // Distinguish between Not Found and Restricted
            let errorType: ErrorType = 'VIDEO_UNAVAILABLE';
            let message = 'Video is unavailable (restricted)';

            const lowerReason = reason.toLowerCase();
            if (pStatus?.status === 'ERROR' && (lowerReason.includes('not found') || lowerReason.includes('không tồn tại'))) {
                message = 'Video not found';
            } else if (lowerReason.includes('age') || lowerReason.includes('độ tuổi')) {
                message = 'Video is age-restricted';
            } else if (lowerReason.includes('private') || lowerReason.includes('riêng tư')) {
                message = 'Video is private';
            } else if (lowerReason.includes('login') || lowerReason.includes('đăng nhập')) {
                message = 'Login required (restricted video)';
            }

            // Special Case: Even if "unplayable", sometimes caption_tracks are still in the metadata
            if (info.captions?.caption_tracks?.length > 0) {
                console.log('💡 Even though unplayable, captions were found in metadata. Attempting to proceed...');
            } else {
                return createErrorResponse(
                    message,
                    errorType,
                    reason,
                    false
                );
            }
        }

        // Get caption tracks
        const captionTracks = info.captions?.caption_tracks;

        if (!captionTracks || captionTracks.length === 0) {
            console.warn(`⚠️ No captions found for ${videoId}`);
            return createErrorResponse('No captions found for this video', 'NO_CAPTIONS');
        }

        console.log(`📊 Found ${captionTracks.length} tracks available.`);

        // Select and fetch track (same logic, but with more logging)
        const tracks = captionTracks.map((track: any) => ({
            baseUrl: track.base_url,
            languageCode: track.language_code,
            kind: track.kind === 'asr' ? 'asr' : 'manual'
        }));

        let selectedTrack = null;
        const preferredLanguages = Array.isArray(requestedLanguages) ? requestedLanguages : [requestedLanguages];

        for (const lang of preferredLanguages) {
            selectedTrack = tracks.find(t => t.languageCode === lang && t.kind === 'manual') ||
                tracks.find(t => t.languageCode === lang && t.kind === 'asr');
            if (selectedTrack) break;
        }

        if (!selectedTrack) selectedTrack = tracks.find(t => t.kind === 'manual') || tracks[0];

        console.log(`✅ Selected track: ${selectedTrack.languageCode} (${selectedTrack.kind})`);

        // Fetch the caption track content
        // We append fmt=json3 to ensure we get the structure we want to parse
        const transcriptUrl = selectedTrack.baseUrl.includes('?')
            ? `${selectedTrack.baseUrl}&fmt=json3`
            : `${selectedTrack.baseUrl}?fmt=json3`;

        const transcriptRes = await fetch(transcriptUrl);
        if (!transcriptRes.ok) {
            throw new Error(`Failed to fetch transcript data: ${transcriptRes.status}`);
        }

        const transcriptData = await transcriptRes.json();

        if (!transcriptData.events) {
            console.error('❌ Invalid transcript format (no events)');
            throw new Error('Transcript format not recognized');
        }

        const entries: TranscriptEntry[] = transcriptData.events
            .filter((e: any) => e.segs && e.segs.length > 0)
            .map((e: any) => ({
                text: e.segs.map((s: any) => s.utf8).join('').trim(),
                start: (e.tStartMs || 0) / 1000,
                duration: (e.dDurationMs || 0) / 1000
            }))
            .filter((e: any) => e.text.length > 0);

        if (entries.length === 0) {
            return createErrorResponse('Transcript is empty', 'PARSING_ERROR');
        }

        console.log(`🎉 Successfully parsed ${entries.length} segments.`);

        return new Response(
            JSON.stringify({
                captions: entries,
                metadata: {
                    language: selectedTrack.languageCode,
                    kind: selectedTrack.kind,
                    duration: entries[entries.length - 1].start + entries[entries.length - 1].duration,
                    entryCount: entries.length
                }
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        );

    } catch (error: any) {
        console.error('💥 Edge Function Critical Error:', error);
        return createErrorResponse(
            'Internal Server Error',
            'UNKNOWN',
            error.message,
            true,
            500
        );
    }
});
