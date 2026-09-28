# Part 4 — My Rentals QA

ตรวจเมื่อ 28 กันยายน 2026

## ส่งมอบ

- My Rentals แยก Active/History และแสดงสถานะ วันรับ วันคืน ราคา Next Action และลิงก์รายละเอียด
- Booking Detail รวม Receive และ Return timeline ในหน้าเดียว
- แสดงรายการ snapshot, Tracking ขาไป/ขากลับ, Mock Payment, Mock Escrow และ Fit Match แบบข้อมูลรอง
- การทำ action ตรวจสิทธิ์และสถานะผ่าน domain transition เดิม ไม่มี state ซ้ำใน UI
- Booking เดิมแบบ `pending`/`confirmed` ยังเปิดดูได้

## Regression

- Presenter tests ครอบคลุมทุกสถานะ สิทธิ์ วันรับ/คืน ข้อมูลเก่า และขนาดไม่ครบ
- Checkout snapshot เก็บ category, length target และ measurements แบบ clone
- Browser QA ตรวจ Active 4 Booking, History 1 Booking และ Booking Detail ที่มี Receive/Return timeline
- ไม่พบ console error/warning และไม่มี horizontal overflow ในหน้าที่ตรวจ
- ชุดทดสอบเต็มและ responsive matrix บันทึกในผลตรวจของ commit Part 4

## ข้อจำกัด

- Payment, escrow และ tracking เป็นข้อมูลจำลอง
- Fit Match เป็นคะแนนเทียบขนาด ไม่รับประกันความพอดีจริง
