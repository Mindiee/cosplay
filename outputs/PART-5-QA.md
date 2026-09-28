# Part 5 — Lender Workspace QA

ตรวจเมื่อ 28 กันยายน 2026

## ส่งมอบ

- My Closet ใช้ Information Architecture เดียว มีเฉพาะ My Listings และ Rental Requests
- Summary แสดงประกาศที่เปิดอยู่ งานที่ต้องทำ ชุดที่กำลังถูกเช่า Pending Earnings และ Available Earnings
- My Listings แสดงสถานะประกาศ สถานะรายไซซ์ คิวเช่าถัดไป และคำสั่งแก้ไข พัก/เปิด และลบ โดยไม่ลบประวัติ
- Rental Requests แบ่ง “ต้องทำตอนนี้”, “กำลังดำเนินการ” และ “ประวัติ” พร้อมข้อมูลผู้เช่า วันรับ–คืน Payment, Escrow, Tracking และ Next Action เดียว
- Mock earnings ledger แสดง hold, release และ refund ผูกกับ Booking ID
- งานรับคืนและตรวจสภาพมีลำดับก่อนงานส่งออก เพื่อให้ผู้ให้เช่าเห็นงานเร่งด่วนก่อน

## ผลตรวจอัตโนมัติ

- `npm test`: ผ่าน 96/96 กรณี
- ตรวจ syntax JavaScript/ES modules: ผ่าน 46 ไฟล์
- `git diff --check`: ผ่าน
- `studio-catalog.json`: คงรายการ 3D ครบ 15 ชิ้น
- Presenter tests ครอบคลุมสิทธิ์ผู้ให้เช่า คิวงาน ตารางรายไซซ์ refund/release และประกาศที่พักหรือลบ

## ผลตรวจเว็บจริง

- My Listings: พบ 9 ประกาศของ June, แสดงคิวเช่ารายไซซ์และรายการ Mock Balance
- Rental Requests: พบ 3 Booking ที่ต้องทำ, 0 กำลังดำเนินการ และ 1 ประวัติ แต่ละ Booking มีปุ่มถัดไปไม่เกินหนึ่งปุ่ม
- ตรวจทั้ง 1440×900, 1280×1005, 1024×768, 390×844 และ 360×800 ไม่พบ horizontal overflow
- หน้า Rental Requests แสดง 4 Booking cards และ 3 operational actions ตรงกับ summary
- 3D Studio regression: มี WebGL canvas 1 จุดและ catalog 15 ชิ้น ไม่พบ horizontal overflow
- ไม่พบ console error ในหน้าที่ตรวจ

## ข้อจำกัด

- Payment, escrow, tracking, balance และขนส่งเป็นข้อมูลจำลองใน IndexedDB ของเบราว์เซอร์เดียว
- ไม่มี backend, payment gateway, carrier API, chat, review หรือ authentication จริง
- การกู้คืนข้อมูลข้ามเครื่องและการแจ้งเตือนภายนอกอยู่นอก Phase 1
