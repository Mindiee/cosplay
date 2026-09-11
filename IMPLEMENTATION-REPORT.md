# Cosplay Rental Marketplace MVP — Implementation Report

## ขอบเขตที่ส่งมอบ

เว็บ **CLOSET — Cosplay Marketplace** เปลี่ยนเส้นทางหลักจากซื้อขายเป็นเช่าแบบ Frontend-only โดยใช้ HTML, CSS, JavaScript modules และ IndexedDB เดิม ไม่มี backend, API, database ภายนอก หรือ payment จริง

เส้นทางที่ใช้งานได้:

- Marketplace: ค้นหา กรองไซซ์ ราคาเช่าต่อวัน และสภาพ พร้อมรายการโปรดเดิม
- Product Detail: เลือกไซซ์ ดูขนาด รูปตำหนิ Try On และเปิดแบบฟอร์มเช่า
- Rental Review: เลือกไซซ์ วันรับ วันคืน ดูจำนวนวันและราคารวมก่อนส่งคำขอ
- My Rentals: ผู้เช่าเห็นรายละเอียดและสถานะ `รอยืนยัน`, `ยืนยันแล้ว` หรือ `เสร็จสิ้น`
- Rental Requests: ผู้ให้เช่าเห็นคำขอของประกาศตนเอง กดยืนยัน และปิดงานเช่าได้
- Listing: ลงชุดให้เช่าหลายไซซ์ ระบุราคาเช่าต่อวัน รูป ตำหนิ และพรีวิว
- 3D Studio: หุ่นชาย/หญิง โมเดล 3D การหมุน กล้อง สัดส่วน fit และการผสมชิ้นส่วนเดิมทั้งหมด พร้อมปุ่มเช่าที่เปิด Rental Review เดียวกัน

## ข้อมูลและกฎ Booking

Rental Booking เก็บใน `state.rentals` ภายใต้ IndexedDB key `cosplay-v1` และมี `listingId`, `variantId`, `renterId`, `sellerId`, `size`, `pickupDate`, `returnDate`, `dailyPrice`, `rentalDays`, `totalPrice`, `status`, timestamps และ snapshot ของประกาศ

- จำนวนวันนับแบบ inclusive: วันรับ 11 กันยายนและวันคืน 13 กันยายนเท่ากับ 3 วัน
- Booking ใหม่มีสถานะ `pending`; เฉพาะบัญชีผู้ให้เช่าเท่านั้นที่เปลี่ยนเป็น `confirmed` และปิดเป็น `completed`
- Booking ที่ `confirmed` กันช่วงวันที่ทับซ้อนของ listing และ variant เดียวกัน
- Pending หลายคำขออยู่ร่วมกันได้ แต่ระบบตรวจวันชนอีกครั้งก่อนยืนยัน
- การเช่าไม่ตัดสต็อกถาวร จึงกลับมาเช่าช่วงวันที่ไม่ทับซ้อนได้
- ข้อมูล `orders` เดิมยังอยู่และไม่ถูกแปลงหรือลบ แต่ไม่แสดงในเส้นทาง Rental MVP
- Repository เดิมบันทึก transition ใน IndexedDB transaction และใช้ BroadcastChannel แจ้งการเปลี่ยนแปลงระหว่างแท็บ

## ไฟล์หลัก

- `cosplay-domain.js`: วันที่ ราคา availability สิทธิ์ และ state transition ของ Rental
- `cosplay-seed.js`: state version 3 พร้อม `rentals: []`
- `repository.js`: normalize state เก่าและบันทึก Booking ใน transaction เดิม
- `app.js`: Rental Review, confirmation, My Rentals และ Rental Requests
- `studio-ui.js`: เชื่อมชิ้นที่เลือกใน 3D Studio เข้าสู่ Rental Review
- `cosplay-seller.js`: ฟอร์มลงชุดให้เช่าและราคาเช่าต่อวัน
- `tests/rental-domain.test.mjs`: กฎวัน ราคา snapshot สิทธิ์ วันชน และการปิดงานเช่า

## หลักฐานการตรวจ

- Automated tests: 68/68 ผ่านหลังเพิ่ม Rental Flow และสถานะเสร็จสิ้น
- Syntax checks: `app.js`, `cosplay-domain.js`, `cosplay-seed.js`, `cosplay-seller.js`, `repository.js`, `studio-ui.js` ผ่าน
- Browser desktop: Marketplace → Product Detail → เช่า 3 วัน ราคา ฿990 × 3 = ฿2,970 → My Rentals → reload ผ่าน
- Seller flow: สลับจาก Nicha เป็น June → Rental Requests → ยืนยัน → ปิดงานเช่า → สลับกลับ Nicha → My Rentals แสดง `เสร็จสิ้น`
- Availability: ช่วงวันที่ชนกับ confirmed booking ถูกปฏิเสธและค่าที่กรอกยังอยู่; ช่วงเริ่มวันถัดจากวันคืนสร้างได้
- 3D Studio: WebGL โหลดสำเร็จ หุ่นและชุดเดิมยังอยู่ ปุ่ม `เช่าชิ้นนี้` เปิด Rental Review เดียวกับ Product Detail
- Mobile 390×844: Marketplace และ Rental Review ใช้งานได้ ช่องวันเรียงแนวตั้ง ไม่มี console error
- Implementation commits: `55a021e` (rental domain), `b1c14b2` (rental UI and 3D integration)

## การเปิดเดโม

```bash
npm start
```

เปิด `http://127.0.0.1:4173/#shop` หรือเว็บสาธารณะ `https://closet-flax-one.vercel.app/#shop`

## ข้อจำกัด

ข้อมูลอยู่ในเบราว์เซอร์เดียวและอาจหายเมื่อล้าง site data ไม่มี payment, deposit, delivery tracking, chat, review, notifications ภายนอก หรือการล็อก inventory ข้ามเครื่อง โมเดล 3D เป็นภาพประมาณจากสินค้าตัวอย่างและไม่รับประกันความพอดีจริง
