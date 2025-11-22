#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script สำหรับดึงข้อมูล orders ทั้งหมดจาก Firestore
และเตรียมข้อมูลสำหรับ migrate เป็นลำดับเลข 1, 2, 3...
"""

import firebase_admin
from firebase_admin import credentials, firestore
import json
from datetime import datetime

# ✅ เริ่มต้น Firebase Admin SDK
# ต้องมีไฟล์ serviceAccountKey.json ในโฟลเดอร์เดียวกัน
try:
    cred = credentials.Certificate('serviceAccountKey.json')
    firebase_admin.initialize_app(cred)
except Exception as e:
    print(f"❌ ไม่สามารถเชื่อมต่อ Firebase: {e}")
    print("📝 ต้องมีไฟล์ 'serviceAccountKey.json' ในโฟลเดอร์นี้")
    exit(1)

db = firestore.client()

def get_all_orders():
    """ดึงข้อมูล orders ทั้งหมด"""
    print("🔄 กำลังดึงข้อมูล orders ทั้งหมด...")
    
    orders_ref = db.collection('orders')
    orders = orders_ref.stream()
    
    orders_list = []
    for idx, doc in enumerate(orders, 1):
        data = doc.to_dict()
        orders_list.append({
            'doc_id': doc.id,  # Document ID เก่า (ยาว ๆ)
            'order_number': data.get('orderNumber', 'N/A'),  # หมายเลขลำดับใหม่ (ถ้ามี)
            'user_id': data.get('userId', 'N/A'),
            'user_email': data.get('userEmail', 'N/A'),
            'product': data.get('product', {}).get('name', 'N/A'),
            'status': data.get('status', 'N/A'),
            'created_at': str(data.get('createdAt', 'N/A')),
            'index': idx
        })
    
    return orders_list

def save_to_json(orders_list):
    """บันทึกข้อมูล orders ลง JSON file"""
    filename = f"orders_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(orders_list, f, ensure_ascii=False, indent=2)
    
    print(f"✅ บันทึกข้อมูลลง {filename}")
    return filename

def print_orders_summary(orders_list):
    """แสดงข้อมูลสรุป orders"""
    print(f"\n{'='*80}")
    print(f"📊 รวมทั้งหมด: {len(orders_list)} orders")
    print(f"{'='*80}\n")
    
    # แสดง header
    print(f"{'#':<4} {'Document ID':<30} {'Order#':<8} {'Email':<25} {'Status':<10} {'Product':<20}")
    print("-" * 120)
    
    for order in orders_list:
        doc_id = order['doc_id'][:20] + "..." if len(order['doc_id']) > 20 else order['doc_id']
        email = order['user_email'][:20] + "..." if len(order['user_email']) > 20 else order['user_email']
        product = order['product'][:18] + ".." if len(order['product']) > 20 else order['product']
        
        print(f"{order['index']:<4} {doc_id:<30} {str(order['order_number']):<8} {email:<25} {order['status']:<10} {product:<20}")
    
    print("-" * 120)

def main():
    print("\n🚀 เริ่มต้น Migration Script สำหรับ Orders")
    print("=" * 80)
    
    # ดึงข้อมูล orders
    orders_list = get_all_orders()
    
    if not orders_list:
        print("⚠️ ไม่พบ orders ใดในฐานข้อมูล")
        return
    
    # แสดงข้อมูลสรุป
    print_orders_summary(orders_list)
    
    # บันทึกลง JSON
    json_file = save_to_json(orders_list)
    
    print(f"\n✅ ดำเนินการสำเร็จ!")
    print(f"📁 ไฟล์ backup: {json_file}")
    print(f"\n💡 ขั้นตอนต่อไป:")
    print(f"   1. ตรวจสอบข้อมูลใน {json_file}")
    print(f"   2. ทำ migrate ด้วย script อื่นหรือ Firebase Console")
    print(f"   3. อัพเดต Document ID จาก (ยาว) เป็น (1, 2, 3...)")

if __name__ == "__main__":
    main()
