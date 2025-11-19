# Quick Reference Guide - Real-time Updates

## 🎯 What Changed?

Two sections in the Admin Credit Modal now update **in real-time** (no refresh needed):

### 1. 🏆 Top 30 Users (Cumulative Credits)

- **Before:** Static data, needed manual refresh
- **After:** Live updates when credits change or new requests approved

### 2. 📋 Request History (Latest 20)

- **Before:** Static data, needed manual refresh
- **After:** Live updates when new requests submitted or status changes

---

## 🔧 Technical Stack

| Component        | Technology                      |
| ---------------- | ------------------------------- |
| Real-time        | Firestore `onSnapshot()`      |
| Collections      | `users`, `creditRequests`   |
| Update Frequency | Instant (< 500ms)               |
| Cleanup          | Auto-unsubscribe on modal close |

---

## 📍 File Locations

**Main Implementation:** `/myshop/public/index.html`

**Key Functions:**

- `listenToTopUsers()` - Line ~3870
- `listenToCreditHistory()` - Line ~3977
- Global variables - Line ~345

**Documentation Files:**

- `REALTIME_UPDATES_SUMMARY.md` - User-friendly overview
- `TECHNICAL_DOCUMENTATION.md` - Developer reference

---

## ✅ How to Verify It Works

1. **Open Admin Panel** → Click "เติมเครดิตลูกค้า"
2. **Watch Top 30 Table** → Should show "กำลังโหลด..."
3. **Approve a Credit Request** → Row updates automatically
4. **Add New User Credit** → Top 30 recalculates instantly
5. **Check History Section** → New requests appear immediately

---

## 🚨 Potential Issues & Solutions

### Issue: Data not updating

**Solution:**

- Refresh browser (Ctrl+F5)
- Check browser console for errors
- Verify Firestore security rules allow reads

### Issue: Listeners not stopping

**Solution:**

- Check if `closeAdminCredit` button click handler fires
- Verify `TOP_USERS_UNSUB` and `CREDIT_HISTORY_UNSUB` are called

### Issue: Slow updates

**Solution:**

- Monitor network tab (see Firestore requests)
- May need Firestore indexes for complex queries
- Consider adding pagination

---

## 📊 Global Variables

```javascript
// Listener subscriptions (top of script, ~line 345)
let TOP_USERS_UNSUB = null;           // Unsubscribe function for top users
let CREDIT_HISTORY_UNSUB = null;      // Unsubscribe function for history
```

These are set to functions returned by `onSnapshot()` and called to cleanup.

---

## 🔄 Listener Lifecycle

```
Modal Opens
    ↓
loadTopUsersList() + loadCreditRequestHistory()
    ↓
listenToTopUsers() + listenToCreditHistory()
    ↓
onSnapshot() sets up listeners
    ↓
[Firestore changes trigger updates]
    ↓
Modal Closes
    ↓
TOP_USERS_UNSUB() + CREDIT_HISTORY_UNSUB()
    ↓
Listeners cleaned up
```

---

## 🎨 Visual Indicators

### Top 30 Table

```
| 序号 | 用户名 | 当前/累积余额 |
|------|-------|------------|
| 1    | john  | 500 / 2500 |  ← Current / Accumulated
| 2    | jane  | 200 / 1800 |
```

### Request History

```
📧 user@example.com    ⏳ รอตรวจสอบ
   จำนวน: 500 เครดิต
   วันที่: 19/11/2568 14:30
   
📧 other@email.com    ✅ อนุมัติแล้ว
   จำนวน: 1000 เครดิต
   วันที่: 19/11/2568 10:15
```

---

## 🛠️ Maintenance Checklist

- [ ] Test real-time updates monthly
- [ ] Monitor Firestore read costs
- [ ] Review error logs for listener failures
- [ ] Check cleanup on modal close
- [ ] Verify no duplicate listeners on re-open
- [ ] Update documentation if features change

---

## 📞 Support

**Issue?** Check:

1. Browser console (F12) for errors
2. Firestore rules in Firebase Console
3. Network tab for failed requests
4. Document at TECHNICAL_DOCUMENTATION.md

---

## 🚀 Future Improvements

- [ ] Add pagination (view all users, not just top 30)
- [ ] Add search/filter functionality
- [ ] Add sorting options (by amount, date, status)
- [ ] Add real-time notifications/toasts
- [ ] Optimize queries with Firestore indexes

---

**Quick Links:**

- Admin Modal: `#adminCreditModal`
- Top 30 Table: `#topUsersList`
- History List: `#creditHistoryList`

**Last Updated:** November 19, 2025
**Status:** ✅ Active
