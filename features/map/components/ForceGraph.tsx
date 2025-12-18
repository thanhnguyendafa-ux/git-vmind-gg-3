
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { GraphNode, GraphLink, NodeType } from '../hooks/useGraphData';
import { useUIStore } from '../../../stores/useUIStore';
import { nodeIcons } from './nodeIcons';

interface ForceGraphProps {
    nodes: GraphNode[];
    links: GraphLink[];
    onNodeClick: (node: GraphNode) => void;
    focusNodeId?: string | null;
}

const ForceGraph: React.FC<ForceGraphProps> = ({ nodes, links, onNodeClick, focusNodeId }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
    const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
    const { theme } = useUIStore();

    useEffect(() => {
        if (!svgRef.current) return;

        const width = svgRef.current.clientWidth;
        const height = svgRef.current.clientHeight;
        const svg = d3.select(svgRef.current);

        if (!simulationRef.current) {
            // --- INITIAL SETUP ---
            const g = svg.append("g");

            const markerColor = theme === 'dark' ? "#475569" : "#94a3b8";
            svg.append("defs").append("marker")
                .attr("id", "arrowhead-graph")
                .attr("viewBox", "-0 -5 10 10")
                .attr("refX", 22).attr("refY", 0)
                .attr("orient", "auto")
                .attr("markerWidth", 5).attr("markerHeight", 5)
                .append("svg:path").attr("d", "M 0,-5 L 10 ,0 L 0,5").attr("fill", markerColor);

            const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.2, 5]).on("zoom", (event) => g.attr("transform", event.transform));
            zoomRef.current = zoom;
            svg.call(zoom).call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(0.8));

            simulationRef.current = d3.forceSimulation<GraphNode, GraphLink>()
                .force("link", d3.forceLink<GraphNode, GraphLink>().id(d => d.id).distance(d => d.type === 'leaf' ? 80 : 180).strength(0.6))
                .force("charge", d3.forceManyBody().strength(d => (d.type === 'table' ? -1500 : -300)))
                .force("collide", d3.forceCollide().radius(d => d.radius * 2).iterations(2))
                .force("center", d3.forceCenter(0, 0));

            g.append("g").attr("class", "links");
            g.append("g").attr("class", "nodes");
        }

        const g = svg.select("g");
        const simulation = simulationRef.current;

        // --- UPDATE ---

        // Update links
        const link = g.select<SVGGElement>(".links")
            .selectAll<SVGPathElement, GraphLink>("path")
            .data(links, (d: any) => `${(d.source as GraphNode).id}-${(d.target as GraphNode).id}`);

        link.exit().transition().duration(300).style("opacity", 0).remove();
        const linkEnter = link.enter().append("path")
            .attr("stroke", theme === 'dark' ? "#475569" : "#94a3b8")
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", d => d.type === 'leaf' ? "2,2" : null)
            .attr("fill", "none")
            .attr("marker-end", "url(#arrowhead-graph)")
            .style("opacity", 0);

        const mergedLinks = link.merge(linkEnter);
        mergedLinks.transition().duration(300).style("opacity", d => d.opacity ?? 1);

        // Update nodes
        const node = g.select<SVGGElement>(".nodes")
            .selectAll<SVGGElement, GraphNode>(".node")
            .data(nodes, d => d.id);

        node.exit().transition().duration(300).style("opacity", 0).remove();

        const nodeEnter = node.enter().append("g")
            .attr("class", "node")
            .style("cursor", "pointer")
            .call(drag(simulation) as any)
            .on("click", (event, d) => { event.stopPropagation(); onNodeClick(d); })
            .style("opacity", 0);

        const strokeColor = theme === 'dark' ? "rgba(15,26,23,0.8)" : "rgba(244,247,245,0.8)";
        nodeEnter.append("circle").attr("stroke", strokeColor).attr("stroke-width", 2);
        nodeEnter.append("g").attr("class", "icon-group").style('pointer-events', 'none');
        nodeEnter.append("text")
            .attr("text-anchor", "middle")
            .style("font-size", '10px')
            .style("font-weight", "600")
            .style("fill", theme === 'dark' ? "#e2e8f0" : "#334155")
            .style("pointer-events", "none")
            .style("paint-order", "stroke")
            .style("stroke", strokeColor)
            .style("stroke-width", "3px")
            .style("stroke-linejoin", "round");

        const mergedNodes = node.merge(nodeEnter);
        mergedNodes.transition().duration(300).style("opacity", d => d.opacity ?? 1);

        mergedNodes.select("circle").attr("r", d => d.radius).attr("fill", d => d.color);
        mergedNodes.select<SVGGElement>(".icon-group").each(function (d) {
            const iconGroup = d3.select(this);
            iconGroup.selectAll("*").remove(); // Clear previous icon

            // Skip icon for 'row' type to keep it simple (just text/dot)
            if (d.type === 'row') return;

            // @ts-ignore
            const iconData = nodeIcons[d.type];
            if (iconData) {
                const iconSize = d.radius * 1.2;
                const scale = iconSize / iconData.viewBoxSize;
                iconGroup.attr('transform', `scale(${scale}) ${iconData.transform}`);
                iconData.paths.forEach((pathData: string) => {
                    iconGroup.append('path').attr('d', pathData).attr('fill', d.type === 'table' ? 'currentColor' : 'white').attr('stroke', 'none');
                });
            }
        });
        mergedNodes.select("text")
            .attr("dy", d => d.radius + 12)
            .text(d => d.label.length > 25 ? d.label.substring(0, 25) + '...' : d.label);

        simulation.nodes(nodes);
        (simulation.force("link") as d3.ForceLink<GraphNode, GraphLink>)?.links(links);
        simulation.alpha(0.3).restart();

        simulation.on("tick", () => {
            mergedLinks.attr("d", (d: any) => `M ${d.source.x} ${d.source.y} L ${d.target.x} ${d.target.y}`);
            mergedNodes.attr("transform", d => `translate(${d.x || 0},${d.y || 0})`);
        });

        // D3 Drag Helper
        function drag(simulation: d3.Simulation<GraphNode, any>) {
            function dragstarted(event: any, d: GraphNode) { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; }
            function dragged(event: any, d: GraphNode) { d.fx = event.x; d.fy = event.y; }
            function dragended(event: any, d: GraphNode) { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }
            return d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended);
        }

    }, [nodes, links, theme, onNodeClick]);

    // Handle programmatic focus/zoom
    useEffect(() => {
        if (focusNodeId && svgRef.current && zoomRef.current) {
            const node = nodes.find(n => n.id === focusNodeId);
            if (node && node.x !== undefined && node.y !== undefined) {
                const svg = d3.select(svgRef.current);
                const width = svgRef.current.clientWidth;
                const height = svgRef.current.clientHeight;
                const scale = 1.5;
                const transform = d3.zoomIdentity.translate(width / 2, height / 2).scale(scale).translate(-node.x, -node.y);

                svg.transition().duration(750).call(zoomRef.current.transform, transform);
            }
        }
    }, [focusNodeId, nodes]);

    return <svg ref={svgRef} className="w-full h-full" />;
};

export default ForceGraph;
