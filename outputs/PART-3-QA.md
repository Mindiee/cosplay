# Part 3 — SVG UI, Fit Match and Try-on QA

ตรวจเมื่อ 28 กันยายน 2026 บน branch `main`

## ขอบเขตที่ส่งมอบ

- ใช้ `toosuepha.css` เป็น visual shell เดียว โดย `index.html` ไม่โหลด stylesheet ของ Legacy UI
- Home, Marketplace, Product Detail, Virtual Try-On และ 3D Studio ใช้ grid, spacing, typography, color, card, control และ placement ตาม SVG ที่แนบ
- Marketplace รองรับ occasion, type, size, condition, daily budget, shared rental dates และ Fit Match sorting
- Product และ Try-on ใช้ Fit Match จาก body/garment measurements และเปิด 3D ของ listing/variant ที่เลือกโดยตรง
- 3D Studio ใช้ renderer, mannequin profiles, saved outfit, clothing data และ assets เดิมทั้งหมด พร้อมเสื้อผ้าจริง 15 ชิ้น
- Rental bag เชื่อมวันและไซซ์จาก Product/Try-on ไป atomic multi-seller mock checkout โดยไม่สร้าง backend

## ผลตรวจอัตโนมัติ

- `npm test`: 83/83 ผ่าน
- Syntax check: JavaScript ทุกไฟล์ผ่าน
- `git diff --check`: ผ่าน
- Asset regression: แค็ตตาล็อก Studio มี 15 ชิ้นและ binary assets ครบ
- Mannequin regression: หญิง/ชาย, body deformation, slot exclusivity และ garment geometry ผ่าน

## ผลตรวจในเบราว์เซอร์

ตรวจ Home, Marketplace, Product Detail, Virtual Try-On และ 3D Studio ที่ viewport ต่อไปนี้:

- Desktop 1440 × 900
- SVG frame 1280 × 1005
- Tablet 1024 × 768
- Mobile 390 × 844 และ 360 × 800

ทุกหน้าไม่เกิด horizontal overflow. หน้าที่ใช้ 3D มี WebGL canvas หนึ่งตัวหลัง navigation. Studio แสดงสินค้าครบ 15 ชิ้น สลับหุ่นหญิง/ชายและสวมชิ้นใหม่ได้ โดยไม่มี console error/warning.

ตรวจ state ที่บันทึกใน IndexedDB หลัง reload:

- ฝั่งผู้เช่าเห็น Booking 5 รายการพร้อมสถานะและวันที่
- ฝั่งผู้ให้เช่าเห็น Rental Request 4 รายการ รวมสถานะร้านกำลังเตรียมชุดและประวัติเดิม
- การสลับบัญชีเปลี่ยนมุมผู้เช่า/ผู้ให้เช่าโดยใช้บัญชีเดียวตามข้อกำหนด

## ข้อจำกัดที่แสดงใน UI

- Payment, shipping, tracking และ escrow เป็นข้อมูลจำลอง
- Fit Match เป็นคะแนนเทียบขนาดเดโม ไม่รับประกันความพอดีจริง
- 3D เป็น virtual preview จากโมเดลโดยประมาณ ไม่ใช่ cloth simulation หรือสแกนสินค้า
