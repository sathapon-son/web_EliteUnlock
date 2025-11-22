#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script สำหรับ migrate orders จาก Document ID ยาว เป็นลำดับเลข 1, 2, 3...
ขั้นตอน:
1. ดึงข้อมูล orders ทั้งหมด
2. บันทึก backup ลงเครื่อง
3. บันทึก preview สำหรับตรวจสอบ
4. ขอยืนยันก่อนทำจริง
5. ทำ migration (สร้าง document ใหม่ + ลบ document เก่า)
6. บันทึกผลลัพธ์
"""

import firebase_admin
from firebase_admin import credentials, firestore
import json
from datetime import datetime

def serialize_firestore_doc(obj):
    """แปลง Firestore objects ให้ JSON-serializable"""
    # แปลง datetime objects เป็น ISO format string
    if hasattr(obj, 'isoformat'):
        return obj.isoformat()
    elif isinstance(obj, dict):
        return {k: serialize_firestore_doc(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [serialize_firestore_doc(item) for item in obj]
    else:
        return obj

try:
    cred = credentials.Certificate('serviceAccountKey.json')
    firebase_admin.initialize_app(cred)
except Exception as e:
    print(f"❌ ไม่สามารถเชื่อมต่อ Firebase: {e}")
    print("📝 ต้องมีไฟล์ serviceAccountKey.json ในโฟลเดอร์นี้")
    exit(1)

db = firestore.client()

def save_backup_data(orders_data):
    """บันทึกข้อมูล orders สำรอง (สำหรับ restore ถ้าจำเป็น)"""
    filename = f"orders_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    # แปลง Firestore objects เป็น JSON-serializable
    serialized_orders = []
    for order in orders_data:
        serialized_orders.append({
            'old_doc_id': order['old_doc_id'],
            'data': serialize_firestore_doc(order['data'])
        })
    
    backup = {
        'backup_time': datetime.now().isoformat(),
        'total_orders': len(serialized_orders),
        'orders': serialized_orders
    }
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(backup, f, ensure_ascii=False, indent=2)
    
    print(f"✅ บันทึกสำรองแล้ว: {filename}")
    return filename

def save_migration_preview(orders_data):
    """บันทึกตัวอย่างข้อมูลที่จะ migrate"""
    filename = f"migration_preview_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    preview = []
    new_order_number = 1
    
    for order_item in orders_data:
        old_doc_id = order_item['old_doc_id']
        data = order_item['data']
        
        if 'orderNumber' not in data or data['orderNumber'] is None:
            order_number = new_order_number
        else:
            order_number = data['orderNumber']
            new_order_number = max(new_order_number, order_number)
        
        created_at = data.get('createdAt', 'N/A')
        try:
            if created_at is None:
                created_at = 'N/A'
            elif hasattr(created_at, 'isoformat'):
                created_at = created_at.isoformat()
            else:
                created_at = str(created_at)
        except Exception:
            created_at = str(created_at)
        
        preview.append({
            'old_document_id': old_doc_id,
            'new_document_id': str(order_number),
            'order_number': order_number,
            'user_email': data.get('userEmail', 'N/A'),
            'status': data.get('status', 'N/A'),
            'created_at': str(created_at)
        })
        
        new_order_number += 1
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(preview, f, ensure_ascii=False, indent=2)
    
    print(f"✅ บันทึกตัวอย่าง: {filename}")
    return filename

def save_migration_log(log):
    """บันทึกผล migration"""
    filename = f"migration_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(log, f, ensure_ascii=False, indent=2)
    
    print(f"📁 บันทึกผลลัพธ์: {filename}")

def migrate_orders():
    """Migrate orders จาก Document ID ยาวเป็นลำดับเลข"""
    print("\n🔄 กำลังดึงข้อมูล orders ทั้งหมด...")
    
    orders_ref = db.collection('orders')
    orders = orders_ref.stream()
    
    orders_data = []
    for doc in orders:
        data = doc.to_dict()
        orders_data.append({
            'old_doc_id': doc.id,
            'data': data
        })
    
    if not orders_data:
        print("⚠️ ไม่พบ orders ใดในฐานข้อมูล")
        return
    
    # Sort by createdAt เพื่อให้ได้ลำดับเดียวกัน
    orders_data.sort(key=lambda x: x['data'].get('createdAt', 0))
    
    print(f"\n📊 พบทั้งหมด: {len(orders_data)} orders")
    
    # ขั้นตอน 1: บันทึกข้อมูลสำรองก่อน
    print("\n💾 ขั้นตอนที่ 1: บันทึกข้อมูลสำรอง...")
    backup_file = save_backup_data(orders_data)
    
    # ขั้นตอน 2: บันทึก preview
    print("\n📋 ขั้นตอนที่ 2: บันทึก preview สำหรับตรวจสอบ...")
    preview_file = save_migration_preview(orders_data)
    
    # ขั้นตอน 3: แสดงข้อมูลสรุป
    print(f"\n{'='*80}")
    print(f"📝 สรุปก่อน Migration:")
    print(f"{'='*80}")
    print(f"   • จำนวน orders ที่จะ migrate: {len(orders_data)}")
    print(f"   • ไฟล์ backup: {backup_file}")
    print(f"   • ไฟล์ preview: {preview_file}")
    print(f"\n⚠️  การ migrate นี้จะ:")
    print(f"   1. สร้าง orders ใหม่ด้วย Document ID = ลำดับเลข (1,2,3...)")
    print(f"   2. ลบ orders เก่า (Document ID ยาว ๆ)")
    print(f"\n💡 คำแนะนำ:")
    print(f"   • ตรวจสอบไฟล์ {preview_file} ให้ดีก่อน")
    print(f"   • มีไฟล์ {backup_file} สำหรับการ restore")
    print(f"{'='*80}\n")
    
    # ขั้นตอน 4: ขอยืนยัน
    print("🤔 ต้องการดำเนินการต่อไหม?")
    print("   (type 'yes' เพื่อทำ migration จริง, หรือ 'no' เพื่อยกเลิก)")
    confirm = input("\nพิมพ์ yes หรือ no: ").strip().lower()
    
    if confirm != 'yes':
        print("\n❌ ยกเลิกการ migration")
        print(f"✅ ข้อมูลสำรองถูกบันทึกแล้วใน: {backup_file}")
        return
    
    # ขั้นตอน 5: ทำ migration
    print(f"\n🚀 กำลังเริ่ม migration...\n")
    
    migration_log = []
    new_order_number = 1
    success_count = 0
    error_count = 0
    
    for idx, order_item in enumerate(orders_data, 1):
        old_doc_id = order_item['old_doc_id']
        data = order_item['data']
        
        # ตั้ง orderNumber ใหม่ (ถ้ายังไม่มี)
        if 'orderNumber' not in data or data['orderNumber'] is None:
            data['orderNumber'] = new_order_number
        else:
            new_order_number = max(new_order_number, data['orderNumber'])
        
        current_order_number = data['orderNumber']
        
        try:
            # สร้าง document ใหม่ด้วย orderNumber เป็น ID
            new_doc_id = str(current_order_number)
            db.collection('orders').document(new_doc_id).set(data)
            
            # ลบ document เก่า
            db.collection('orders').document(old_doc_id).delete()
            
            log_entry = {
                'status': '✅',
                'old_id': old_doc_id,
                'new_id': new_doc_id,
                'order_number': current_order_number,
                'email': data.get('userEmail', 'N/A')
            }
            migration_log.append(log_entry)
            
            success_count += 1
            print(f"[{idx}/{len(orders_data)}] ✅ {new_doc_id:4} (เก่า: {old_doc_id[:16]}...)")
            
        except Exception as e:
            error_count += 1
            log_entry = {
                'status': '❌',
                'old_id': old_doc_id,
                'error': str(e)
            }
            migration_log.append(log_entry)
            print(f"[{idx}/{len(orders_data)}] ❌ ผิดพลาด: {str(e)[:50]}...")
        
        new_order_number += 1
    
    # ขั้นตอน 6: บันทึกผลลัพธ์
    print(f"\n💾 บันทึกผล migration...")
    save_migration_log(migration_log)
    
    # ขั้นตอน 7: แสดงสรุปผลลัพธ์
    print(f"\n{'='*80}")
    print(f"✅ Migration สำเร็จ!")
    print(f"{'='*80}")
    print(f"   • สำเร็จ: {success_count} orders")
    print(f"   • ผิดพลาด: {error_count} orders")
    print(f"   • ไฟล์ backup: {backup_file}")
    print(f"   • ไฟล์ result: migration_log_*.json")
    print(f"{'='*80}\n")

def main():
    print("\n" + "="*80)
    print("🚀 MIGRATION TOOL: Orders (Document ID ยาว → ลำดับเลข)")
    print("="*80)
    print("\nscript นี้จะ:")
    print("  1. ดึงข้อมูล orders ทั้งหมด")
    print("  2. บันทึก backup สำรอง")
    print("  3. บันทึก preview เพื่อให้ตรวจสอบ")
    print("  4. ขอยืนยันก่อนทำจริง")
    print("  5. ทำ migration (สร้าง + ลบ)")
    print("  6. บันทึกผลลัพธ์")
    print("\n" + "="*80)
    
    migrate_orders()

if __name__ == "__main__":
    main()
