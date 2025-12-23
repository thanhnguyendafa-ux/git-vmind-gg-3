# Auto-Fetch Transcript Feature Guide 🎬

## Tổng quan

Tính năng **Auto-Fetch Transcript** cho phép bạn tự động lấy phụ đề từ YouTube mà không cần copy-paste thủ công. Bạn chỉ cần:
1. Dán link YouTube
2. Nhấn "Auto-Fetch"
3. Chọn đoạn muốn học bằng cách đánh dấu thời gian
4. Trích xuất tự động

## Hướng dẫn sử dụng

### Bước 1: Fetch Transcript đầy đủ

1. Mở **Dictation Editor** (chỉnh sửa hoặc tạo mới một Dictation Note)
2. Dán link YouTube vào ô **YouTube URL**
3. Click nút **🎬 Auto-Fetch Full Transcript**
4. Đợi vài giây để hệ thống tải transcript (sẽ hiển thị "✅ Transcript Loaded")

### Bước 2: Đánh dấu thời gian

Sau khi transcript đã được tải:

1. **Phát video** và xem đoạn bạn muốn học
2. Tạm dừng tại **điểm bắt đầu** → Click **[ Start** 
   - Thời gian sẽ được ghi lại và hiển thị (ví dụ: `[ Start 1:23`)
3. Phát tiếp và tạm dừng tại **điểm kết thúc** → Click **End ]**
   - Thời gian kết thúc sẽ được ghi (ví dụ: `End ] 2:45`)

### Bước 3: Trích xuất đoạn

1. Click nút **✂️ Extract Segment**
2. Hệ thống sẽ tự động:
   - Lọc các dòng transcript từ thời gian bắt đầu đến kết thúc
   - Thêm vào danh sách transcript của bạn
   - Hiển thị thông báo thành công

### Lặp lại để thêm nhiều đoạn

Bạn có thể lặp lại Bước 2 và 3 để thêm nhiều đoạn khác nhau vào cùng một Dictation Note.

## Ví dụ thực tế

**Tình huống:** Bạn muốn học một đoạn 30 giây từ một video TED Talk dài 15 phút.

**Trước đây:**
1. Mở YouTube → Bật phụ đề
2. Xem video và copy từng câu
3. Paste vào app
4. Tốn ~5-10 phút

**Bây giờ:**
1. Dán link → Click "Auto-Fetch" (1 lần cho toàn bộ video)
2. Xem video, pause tại 1:20 → Click [ Start
3. Pause tại 1:50 → Click End ]
4. Click "Extract Segment"
5. ✅ Xong! (~30 giây)

## Lưu ý kỹ thuật

### Transcript API
- Sử dụng CORS proxy để fetch transcript từ YouTube
- Chỉ hoạt động với video có phụ đề tự động (auto-generated captions)
- Ngôn ngữ mặc định: `en` (tiếng Anh)

### Dữ liệu lưu trữ
- `fullTranscript`: Toàn bộ transcript của video (cache để tái sử dụng)
- `transcript`: Các đoạn bạn đã trích xuất và chỉnh sửa

### Video không có phụ đề?
Nếu video không có auto-generated captions:
- Hệ thống sẽ hiển thị lỗi
- Bạn vẫn có thể sử dụng chức năng "Import Transcript" thủ công (phần bên dưới)

## Các tính năng hiện có vẫn hoạt động

Tính năng mới này **KHÔNG thay thế** các tính năng cũ:
- ✅ Vẫn có thể paste transcript thủ công
- ✅ Vẫn edit được từng dòng
- ✅ Vẫn merge/split segments
- ✅ Vẫn link to table

## Ưu điểm

🚀 **Tăng tốc 10x** quy trình tạo Dictation  
🎯 **Chính xác** - Lấy đúng timestamp từ YouTube  
♻️ **Tái sử dụng** - Fetch 1 lần, extract nhiều đoạn  
🧠 **Thông minh** - Tự động merge các câu trong khoảng thời gian

## Troubleshooting

**Lỗi: "Could not fetch transcript"**
- Kiểm tra video có phụ đề không (Settings → Subtitles/CC)
- Thử video khác có phụ đề tự động
- Báo lỗi nếu vẫn không hoạt động

**Lỗi: "Video player is not ready"**
- Đợi vài giây để player load xong
- Refresh trang nếu cần

**Extracted segment trống**
- Kiểm tra lại thời gian Start < End
- Đảm bảo khoảng thời gian có nội dung (không phải đoạn im lặng)

---

**Built with ❤️ by Dev 90**  
*Version 1.0 - Dec 2025*
