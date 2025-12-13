# Vmind Architecture Document v2.6 - The Resilient User Experience

Phiên bản: 2.6 (Refined)
Trọng tâm: Tối ưu hóa UX, Xử lý lỗi phụ thuộc, Tiết kiệm tài nguyên & Tính tiếp cận (Accessibility).

---

### 1. Mục tiêu & Phạm vi (Goals & Scope)
*   **Mục tiêu cốt lõi:** Xây dựng hệ thống không chỉ "Anti-fragile" về mặt dữ liệu mà còn **"Thân thiện và Ổn định"** về mặt trải nghiệm.
*   **Yêu cầu phi chức năng bổ sung:**
    *   **Humanized Error Handling:** Người dùng cuối không bao giờ phải nhìn thấy mã lỗi kỹ thuật (JSON/HTTP Codes).
    *   **Resource Efficiency:** Hệ thống đồng bộ không được gây hao pin hoặc nóng máy.
    *   **Visual Stability:** Giao diện không được giật, nhảy (layout shift) khi dữ liệu được cập nhật ngầm.
    *   **Data Integrity:** Đảm bảo tính toàn vẹn dữ liệu khi có sự phụ thuộc giữa các items (Parent-Child).

---

### 2. Kiến trúc Build và Quản lý Phụ thuộc (Build & Dependency Architecture)

Để đảm bảo khả năng mở rộng, hiệu năng, và bảo mật dài hạn, Vmind sẽ chuyển đổi từ mô hình "no-build" (sử dụng `importmap` và CDN) sang một quy trình build hiện đại.

*   **Hiện trạng:** Ứng dụng tải các thư viện (React, Zustand, v.v.) trực tiếp từ CDN trong `index.html`. Cách tiếp cận này phù hợp cho việc tạo mẫu nhanh nhưng tiềm ẩn nhiều rủi ro khi phát triển ở quy mô lớn.
*   **Quyết định:** Áp dụng **Vite** làm công cụ build chính cho dự án.
*   **Analogy:** Chuyển từ việc lắp ráp một chiếc "xe từ kit" (mua linh kiện từ nhiều nhà cung cấp CDN khác nhau) sang một "dây chuyền sản xuất hiện đại" (quản lý, tối ưu và đóng gói tất cả các bộ phận một cách tập trung và an toàn).

#### 2.1. Lý do & Mục tiêu
Việc chuyển đổi sang Vite nhằm giải quyết các nguy cơ cốt lõi và đưa Vmind trở thành một sản phẩm web chuyên nghiệp, sẵn sàng cho sự phát triển trong tương lai.
*   **Tăng hiệu năng:** Giảm thời gian tải trang cho người dùng cuối thông qua bundling, tree-shaking và code-splitting.
*   **Tăng độ tin cậy và bảo mật:** Loại bỏ sự phụ thuộc vào các CDN của bên thứ ba, giảm thiểu rủi ro khi CDN gặp sự cố hoặc bị tấn công (supply chain attack).
*   **Cải thiện Trải nghiệm Lập trình viên (DX):** Cung cấp một môi trường phát triển nhanh, mạnh mẽ với Hot Module Replacement (HMR) và quản lý phụ thuộc chặt chẽ.
*   **Tăng khả năng bảo trì:** Chuẩn hóa cấu trúc dự án theo tiêu chuẩn ngành (sử dụng `package.json`), giúp việc onboarding và tích hợp các công cụ CI/CD trở nên dễ dàng.

#### 2.2. Phân tích chi tiết
*   **2.2.1. Trải nghiệm Lập trình viên (DX):**
    *   **Phát triển nhanh:** Server dev khởi động gần như ngay lập tức.
    *   **Quản lý phụ thuộc:** `package.json` và `npm` đảm bảo phiên bản thư viện nhất quán, tránh các lỗi không mong muốn do phiên bản tự động cập nhật trên CDN.
    *   **Tích hợp sẵn:** Hỗ trợ TypeScript, JSX, PostCSS mà không cần cấu hình phức tạp.
*   **2.2.2. Hiệu năng & Trải nghiệm Người dùng (UX):**
    *   **Bundling & Tree-Shaking:** Đóng gói code thành các file nhỏ gọn, loại bỏ code không sử dụng để giảm kích thước tải về.
    *   **Code Splitting:** Tự động tách code theo màn hình (routes). Người dùng chỉ tải phần code cần thiết cho giao diện họ đang xem, tương tự cách hoạt động của Notion.
*   **2.2.3. Bảo mật, Độ tin cậy & Vận hành:**
    *   **An toàn:** Toàn bộ code được kiểm soát và build từ một nguồn duy nhất.
    *   **Tin cậy:** Ứng dụng không còn phụ thuộc vào tình trạng hoạt động của các CDN bên ngoài.
    *   **Chuẩn hóa:** Cấu trúc dự án tiêu chuẩn giúp dễ dàng tuyển dụng, bảo trì và mở rộng hệ thống.

---

### 3. Nguyên tắc thiết kế: "Chiếc Hộp Đen" VmindSyncEngine

Tiếp tục duy trì **VmindSyncEngine** là trái tim của hệ thống, hoạt động như một dịch vụ nền độc lập (background service) quản lý hàng đợi và giao tiếp mạng.

---

### 4. Chiến lược Xử lý Lỗi & UX (The Human Translation Layer)

Nâng cấp cơ chế xử lý lỗi để giải quyết vấn đề "Dead Letter Queue" và "Dependency Chain".

*   **Lớp "Error Mapper" (Người phiên dịch lỗi):**
    *   Map lỗi 4xx từ Server (VD: `ERR_QUOTA_EXCEEDED`) sang ngôn ngữ tự nhiên.
*   **Giao diện "Needs Attention" (Thay cho DLQ UI):**
    *   Hiển thị mục "Dữ liệu cần kiểm tra" với badge màu vàng/cam.
    *   Cho phép sửa lỗi trực tiếp (Inline Fixing) và thử lại.
*   **Cơ chế "Dependency Chain Blocking" (MỚI):**
    *   **Vấn đề:** Nếu lệnh "Tạo Folder A" lỗi, lệnh "Tạo Note B trong Folder A" sẽ vô nghĩa nếu gửi lên Server.
    *   **Giải pháp:** Nếu một Item trong hàng đợi (Queue) gặp lỗi và chuyển sang trạng thái `Needs Attention`, tất cả các Item phụ thuộc vào nó (con, cháu) cũng sẽ tự động chuyển sang trạng thái `Waiting for Parent` (Tạm dừng) cho đến khi Item cha được khắc phục.

---

### 5. Chiến lược Tiết kiệm Pin (Battery Vampire Fix)

*   **Capped Exponential Backoff:**
    *   **Retry:** 1s, 2s, 5s, 10s, 30s.
    *   **Max Retries = 5:** Sau 5 lần thất bại do lỗi mạng, **DỪNG HOÀN TOÀN** tiến trình sync nền.
    *   Chuyển sang trạng thái `Paused`.
*   **Điều kiện tái kích hoạt:**
    *   Người dùng bấm nút "Thử lại".
    *   Sự kiện hệ thống `window.ononline`.
    *   Cold Start (Mở lại App).

---

### 6. Giao thức Đồng bộ & Ổn định Giao diện (Visual Stability)

Giải quyết vấn đề nhảy layout và xung đột dữ liệu.

*   **Nguyên tắc "Sticky Sort Order" (Thứ tự dính):**
    *   Khi danh sách đang hiển thị, **KHÔNG** thay đổi thứ tự sắp xếp khi có cập nhật ngầm. Chỉ sắp xếp lại khi người dùng chủ động refresh hoặc điều hướng lại.
*   **Xử lý "Content Shift" (MỚI):**
    *   Đối với nội dung văn bản dài: Nếu bản cập nhật từ Server làm thay đổi lớn độ dài nội dung, không update in-place ngay lập tức.
    *   Hiển thị chỉ báo nhỏ: "Nội dung đã được cập nhật. Nhấn để xem".
*   **Chiến lược giải quyết xung đột (Conflict Resolution - MỚI):**
    *   Áp dụng chiến lược "Last Write Wins" (dựa trên Client Timestamp).
    *   Trong trường hợp xung đột phức tạp không thể tự merge, tạo một bản sao (Duplicate) với tên "Conflict Copy" để người dùng tự xử lý, đảm bảo không mất dữ liệu.

---

### 7. Chiến lược Kiểm thử: Chaos Engineering

Bổ sung kịch bản kiểm thử phụ thuộc.

1.  **The "Flight Mode" Scenario:** Test queue hoạt động khi offline/online.
2.  **The "Bad Payload & Dependency" Scenario (MỚI):**
    *   Tắt mạng -> Tạo Folder A (Lỗi Logic/Tên cấm) -> Tạo Note B trong A.
    *   *Expect:* Folder A vào "Needs Attention". Note B vào trạng thái "Waiting for Parent" (không gửi lên Server). Sau khi sửa Folder A thành công, Note B tự động sync tiếp.
3.  **The "Time Traveler" Scenario:** Test đồng bộ thời gian (Server time vs Device time).
4.  **The "Flaky Network" Scenario:** Test pin và duplicate data trong môi trường mạng yếu.

---

### 8. Design System & Theming: "Deep Forest" (Updated)

Đã tinh chỉnh màu sắc Light Mode để đảm bảo tiêu chuẩn tương phản (Accessibility).

#### 8.1. Bảng màu chuẩn (Dark Mode)
*   **Background:** `#0F1A17` (Very dark hunter green).
*   **Surface:** `#132720` (Dark moss green).
*   **Primary Accent:** `#3DDC84` (Neon Mint Green) - Dùng cho Text nổi bật, Button Background, Icon.
*   **Text Main:** `#E9F5EE`.
*   **Text Subtle:** `#88A496`.

#### 8.2. Bảng màu chuẩn (Light Mode - Adjusted)
*   **Background:** `#F4F7F5` (Off-White/Pale Mint).
*   **Surface:** `#EDF2EE` (Light Sage).
*   **Primary Accent (Buttons/Graphic):** `#3DDC84` (Neon Mint Green) - Giữ nguyên cho nền nút bấm để đồng bộ thương hiệu.
*   **Primary Accent (Text/Icons):** `#059669` (Emerald Green 600) - (MỚI) Dùng phiên bản đậm hơn cho Text/Icon trên nền sáng để dễ đọc.
*   **Text Main:** `#0D1F1A`.
*   **Text Subtle:** `#60736D`.

---

### 9. Data Migration Strategy (MỚI)

Đảm bảo an toàn dữ liệu khi nâng cấp App.

*   **Schema Versioning:** Mỗi bản ghi trong IndexedDB phải có trường `_schemaVersion`.
*   **Lazy Migration:** Khi App khởi động phiên bản mới, kiểm tra `_schemaVersion`. Nếu cũ hơn, thực hiện migration dữ liệu sang cấu trúc mới trước khi khởi động `VmindSyncEngine`.
*   **Queue Preservation:** Đảm bảo các items đang nằm trong hàng đợi (chưa sync xong) không bị xóa khi update App.

---

### 10. Lộ trình thực hiện (Roadmap)

1.  **Phase 0:** Chuyển đổi sang Vite Build Process (Kiến trúc nền tảng).
2.  **Phase 1:** `VmindSyncEngine` cơ bản + IndexedDB.
3.  **Phase 2:** "Battery Saver" + "Dependency Blocking Logic".
4.  **Phase 3:** UI "Needs Attention" + Conflict Resolution ("Last Write Wins").
5.  **Phase 4:** Chaos Testing & Design System Implementation.

---

### 11. Nguyên tắc Vàng về Thiết kế & Lập trình (Golden Principles of Design & Programming)

Đây là những quy tắc bắt buộc phải tuân thủ để đảm bảo chất lượng, tính nhất quán và khả năng bảo trì của ứng dụng.

#### 11.1. Sử dụng Đơn vị Tương đối (rem, em, %)
*   **Nguyên tắc:** **TRÁNH** sử dụng đơn vị `px` cho font-size, padding, margin, width, height. **LUÔN** ưu tiên `rem` cho kích thước và khoảng cách để đảm bảo khả năng co giãn và tuân thủ cài đặt của người dùng.
*   **Lý do:** `px` là đơn vị tuyệt đối, không thay đổi theo cài đặt font chữ của trình duyệt, gây khó khăn cho người dùng có vấn đề về thị lực. `rem` co giãn theo font-size gốc của `<html>`, tạo ra một giao diện nhất quán và dễ tiếp cận hơn.
*   **Ví dụ:**
    *   **Sai:** `font-size: 16px; padding: 15px; width: 300px;`
    *   **Đúng:** `font-size: 1rem; padding: 1rem; max-width: 20rem;` (Tailwind: `text-base p-4 max-w-xs`)

#### 11.2. Ưu tiên Thiết kế Mobile-First
*   **Nguyên tắc:** **LUÔN** bắt đầu thiết kế và viết CSS cho màn hình nhỏ nhất (điện thoại) trước, sau đó sử dụng `min-width` media queries để mở rộng cho các màn hình lớn hơn.
*   **Lý do:** Buộc chúng ta tập trung vào nội dung cốt lõi và trải nghiệm quan trọng nhất. Việc thêm các yếu tố phức tạp cho màn hình lớn dễ hơn là loại bỏ chúng cho màn hình nhỏ.
*   **Ví dụ:**
    *   **Sai (PC-First):**
        ```css
        .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; }
        @media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
        ```
    *   **Đúng (Mobile-First):**
        ```css
        .grid { display: grid; grid-template-columns: 1fr; } /* Mặc định là mobile */
        @media (min-width: 768px) { .grid { grid-template-columns: 1fr 1fr 1fr; } } /* Mở rộng cho desktop */
        ```

#### 11.3. Tránh Phụ thuộc vào Trạng thái `:hover`
*   **Nguyên tắc:** **KHÔNG** ẩn các chức năng hoặc thông tin quan trọng chỉ xuất hiện khi người dùng rê chuột.
*   **Lý do:** Trạng thái `:hover` không tồn tại trên các thiết bị cảm ứng. Mọi chức năng phải có thể truy cập được thông qua một cú chạm (tap) hoặc nhấp chuột (click).
*   **Ví dụ:**
    *   **Sai:** Nút "Xóa" chỉ hiện ra khi rê chuột vào một mục trong danh sách.
    *   **Đúng:** Luôn hiển thị một biểu tượng "..." (menu), khi người dùng chạm/click vào đó sẽ mở ra tùy chọn "Xóa".

#### 11.4. Đảm bảo Kích thước Mục tiêu Chạm (Touch Target)
*   **Nguyên tắc:** Mọi yếu tố có thể nhấp/chạm (nút, icon, link) phải có kích thước tối thiểu là `44px x 44px`. Khoảng cách giữa các mục tiêu chạm cũng phải đủ lớn.
*   **Lý do:** Tránh lỗi "ngón tay mập" (fat finger), cải thiện đáng kể trải nghiệm người dùng trên thiết bị di động và tuân thủ các hướng dẫn về khả năng truy cập (WCAG).
*   **Ví dụ:**
    *   **Sai:** `<Icon name="edit" /><Icon name="trash" />` - hai icon nhỏ sát nhau.
    *   **Đúng (Tailwind):**
        ```html
        <div class="flex gap-2">
          <button class="p-2 rounded-full"><Icon name="edit" class="w-6 h-6" /></button>
          <button class="p-2 rounded-full"><Icon name="trash" class="w-6 h-6" /></button>
        </div>
        ```
        (Class `p-2` sẽ tạo ra vùng đệm xung quanh icon, tăng diện tích chạm lên hơn 40px).

#### 11.5. Phòng chống Lỗi Mapping
*   **Nguyên tắc:** **LUÔN** kiểm tra xem một mảng có tồn tại và là một mảng trước khi gọi phương thức `.map()`. Luôn cung cấp một `key` duy nhất cho mỗi phần tử được lặp.
*   **Lý do:** Tránh lỗi runtime "Cannot read properties of undefined (reading 'map')" và giúp React quản lý DOM hiệu quả, tránh các hành vi bất thường.
*   **Ví dụ:**
    *   **Sai:** `items.map(item => <div>{item.name}</div>)`
    *   **Đúng:** `(items || []).map(item => <div key={item.id}>{item.name}</div>)` hoặc `items?.map(item => ...)`

#### 11.6. Xử lý Race Condition trong Tác vụ Bất đồng bộ
*   **Nguyên tắc:** Khi thực hiện các tác vụ bất đồng bộ (ví dụ: `fetch` data) bên trong `useEffect`, **PHẢI** có một cơ chế hủy bỏ (cleanup function) để xử lý trường hợp component bị unmount hoặc có một yêu cầu mới được thực hiện trước khi yêu cầu cũ hoàn thành.
*   **Lý do:** Ngăn chặn việc cập nhật state trên một component đã bị hủy, và đảm bảo giao diện luôn hiển thị dữ liệu từ yêu cầu mới nhất, không phải từ một yêu cầu cũ hơn nhưng về sau.
*   **Ví dụ:**
    *   **Sai:**
        ```javascript
        useEffect(() => {
          fetch(`/api/data?query=${query}`).then(res => res.json()).then(setData);
        }, [query]);
        ```
    *   **Đúng:**
        ```javascript
        useEffect(() => {
          let isCancelled = false;
          fetch(`/api/data?query=${query}`)
            .then(res => res.json())
            .then(data => {
              if (!isCancelled) {
                setData(data);
              }
            });
          return () => {
            isCancelled = true; // Hủy bỏ việc cập nhật state nếu có yêu cầu mới
          };
        }, [query]);
        ```

#### 11.7. Tuân thủ nghiêm ngặt Yêu cầu
*   **Nguyên tắc:** **KHÔNG** tự ý thêm các tính năng, thay đổi luồng hoạt động hoặc chỉnh sửa giao diện vượt ra ngoài phạm vi yêu cầu đã được chỉ định.
*   **Lý do:** Đảm bảo sản phẩm được phát triển đúng theo kế hoạch, tránh "scope creep" (phình phạm vi) và duy trì sự nhất quán của hệ thống. Mọi sáng tạo phải được thảo luận và phê duyệt.
*   **Ví dụ:**
    *   **Yêu cầu:** "Thêm một nút 'Lưu' ở cuối form."
    *   **Sai (Tự ý sáng tạo):** Thêm nút 'Lưu', nút 'Lưu và Tiếp tục', và một chỉ báo 'Bản nháp'.
    *   **Đúng:** Chỉ thêm duy nhất nút 'Lưu' như đã yêu cầu.

#### 11.8. Đảm bảo Tính nhất quán trong Thiết kế
*   **Nguyên tắc:** **LUÔN** sử dụng các thành phần (components), màu sắc, khoảng cách và font chữ từ Design System đã được định nghĩa trong `architecture.md` (chương 8) và `tailwind.config`.
*   **Lý do:** Tạo ra một giao diện đồng bộ, chuyên nghiệp và dễ bảo trì. Việc tái sử dụng component giúp giảm thiểu lỗi và tăng tốc độ phát triển.
*   **Ví dụ:**
    *   **Sai:** Dùng `margin-top: 15px` ở một nơi và `margin-top: 1rem` ở nơi khác. Dùng màu `#333` cho văn bản.
    *   **Đúng:** Luôn dùng các class của Tailwind như `mt-4` cho khoảng cách. Luôn dùng các màu semantic như `text-text-main` cho văn bản.

#### 11.9. Chú trọng vào Khả năng Truy cập (Accessibility - A11y)
*   **Nguyên tắc:** Mọi yếu tố tương tác phải có thể truy cập được bằng bàn phím. Sử dụng các thuộc tính ARIA khi cần thiết. Đảm bảo độ tương phản màu sắc tuân thủ tiêu chuẩn WCAG AA.
*   **Lý do:** Giúp ứng dụng có thể sử dụng được bởi tất cả mọi người, bao gồm cả người khuyết tật.
*   **Ví dụ:**
    *   **Sai:** Dùng một thẻ `<div>` với `onClick` để làm nút bấm.
    *   **Đúng:** Dùng thẻ `<button>`. Nếu phải dùng `div`, cần thêm `role="button"`, `tabindex="0"`, và xử lý sự kiện `onKeyDown`. Luôn có `alt` text cho hình ảnh.

---

### 12. Quy tắc Thiết kế Giao diện "App-Like" (App-Like Design Principles)

Chuyển đổi giao diện từ bố cục "Website" sang giao diện "Ứng dụng Web Native".

#### 12.1. Kiến trúc Bố cục (App Shell)
*   Tạo một **container viewport 100vh** cứng nhắc với `overflow: hidden`.
*   **Thanh bên/Điều hướng Cố định:** Luôn cố định ở bên trái/trên cùng.
*   **Khu vực Nội dung có thể cuộn:** Chỉ có bảng điều khiển trung tâm chính mới cuộn (`overflow-y: auto`).

#### 12.2. Tương tác & Phản hồi
*   Sử dụng **Skeleton Loaders** (hiệu ứng lung linh) cho các trình giữ chỗ dữ liệu thay vì spinner.
*   Xác định các trạng thái `:hover` và `:active` riêng biệt cho tất cả các yếu tố tương tác để mô phỏng khả năng phản hồi cảm ứng gốc.

#### 12.3. Phân cấp Trực quan
*   **Kiểu chữ:** Sử dụng "System UI Font Stack" (San Francisco trên macOS, Segoe UI trên Windows) để có độ rõ nét tối đa và cảm giác gốc.
*   **Thành phần:** Sử dụng **Cards** và **Modals/Drawers** cho các chế độ xem chi tiết thay vì điều hướng đến các URL mới.
*   **Mục tiêu Chạm:** Đảm bảo tất cả các nút và biểu tượng có khu vực có thể nhấp tối thiểu là **44px** (sử dụng padding).

#### 12.4. Định kích thước Phòng thủ
*   Container Ứng dụng Chính: `height: 100vh` (Toàn màn hình cố định).
*   Chế độ xem Cuộn Nội bộ: `height: 100%` so với cha mẹ.

#### 12.5. Thư viện Component: Trang chủ Dashboard (HomeScreen Component Library)

Phần này phân tích thiết kế hiện tại của `HomeScreen` và đề xuất các thay đổi để tuân thủ chặt chẽ hơn với các nguyên tắc "App-Like" và "Dashboard Widget".

##### 12.5.1. Phân tích Thiết kế Hiện tại
*   **Bố cục (Layout):** `HomeScreen` hiện tại sử dụng một lưới 12 cột phức tạp (`grid-cols-12`) kết hợp với `grid-flow-dense` và các `col-span`, `row-span`.
*   **Xung đột với Nguyên tắc:** Cách tiếp cận này tạo ra một bố cục kiểu "masonry" hoặc "tạp chí", trong đó các phần tử tự lấp đầy không gian trống. Điều này mâu thuẫn với nguyên tắc **"Phân cấp Trực quan" (12.3)** và **"Kiến trúc Bố cục App-Like" (12.1)** vì:
    1.  **Thứ tự không đoán trước:** `grid-flow-dense` có thể thay đổi thứ tự trực quan của các widget trên các kích thước màn hình khác nhau, làm giảm khả năng quét nhanh thông tin.
    2.  **Thiếu tính module:** Các `StatCard` hiện đang được nhóm lại bên trong một ô lưới lớn, thay vì là các widget độc lập. Điều này phá vỡ khái niệm về một dashboard module hóa, nơi mỗi thẻ là một đơn vị thông tin riêng biệt.
    3.  **Phân cấp không rõ ràng:** `RestorationGarden` chiếm một không gian lớn và không đối xứng (`row-span-2`), lấn át các thông tin quan trọng khác. Một dashboard hiệu quả nên trình bày thông tin một cách cân bằng và có thể xem nhanh.

##### 12.5.2. Đề xuất Tái cấu trúc Thiết kế (The Dashboard Pattern)
Để khắc phục những điểm trên và tuân thủ kiến trúc, `HomeScreen` cần được tái cấu trúc thành một dashboard thực sự với các widget module.

*   **Nguyên tắc Bố cục Mới:**
    *   **Lưới có cấu trúc:** Chuyển sang một hệ thống lưới đơn giản và dễ dự đoán hơn, ví dụ: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6`. Bố cục này đảm bảo luồng đọc từ trái sang phải, từ trên xuống dưới một cách nhất quán trên mọi thiết bị.
    *   **Mỗi Widget là một Card:** Mỗi thành phần thông tin (`StreakCard`, `ActivityHeatmap`, `RestorationGarden`, `StatCard`, v.v.) phải là một `Card` độc lập và là con trực tiếp của lưới chính. Điều này tăng tính module, dễ quản lý và sẵn sàng cho các tính năng trong tương lai như tùy chỉnh dashboard.
    *   **Phân cấp có chủ đích:**
        1.  **Hàng đầu (Top Row):** Ưu tiên hiển thị các chỉ số quan trọng, có thể xem nhanh (`StatCard`, `StreakCard`).
        2.  **Hàng giữa (Mid Row):** Dành cho các widget trực quan hóa dữ liệu lớn hơn (`ActivityHeatmap`, `RecentStudiesCard`).
        3.  **Widget Trung tâm:** `RestorationGarden` là một tính năng hấp dẫn, nên được đặt ở một vị trí nổi bật nhưng có cấu trúc, ví dụ như một thẻ rộng toàn bộ (`lg:col-span-4`) hoặc một khối lớn (`lg:col-span-2`), mà không phá vỡ dòng chảy của lưới bằng `row-span`.

*   **Định nghĩa lại Component Widget:**
    *   **`StatCard`:** Một thẻ nhỏ, `1x1`, hiển thị một chỉ số duy nhất (VD: "Today", "Total Words").
    *   **`StreakCard` & `NotificationCard`:** Các thẻ chuyên dụng, có thể chiếm `1x1` hoặc `2x1` tùy thuộc vào lượng thông tin.
    *   **`HeatmapCard` & `RecentStudiesCard`:** Các widget lớn hơn, thường chiếm `2x1` hoặc `2x2` trong lưới.
    *   **`RestorationCard`:** Widget trung tâm, trực quan, có thể chiếm `2x2` hoặc `4x1` (`full-width`) để tạo điểm nhấn mà không làm xáo trộn cấu trúc chung.

Việc áp dụng mô hình dashboard này sẽ giúp `HomeScreen` trở nên gọn gàng, chuyên nghiệp, dễ sử dụng hơn và tuân thủ đúng các nguyên tắc thiết kế đã đề ra.
