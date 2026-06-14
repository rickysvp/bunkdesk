# Tasks

- [x] Task 1: BookingEngine 预订后自动分配床位
  - [x] 1.1 HostelContext 新增 occupyBed 方法，一步完成创建客人和分配床位
  - [x] 1.2 BookingEngine handleConfirm 中查找空床位并调用 occupyBed 分配

- [x] Task 2: BookingEngine 应用活跃促销折扣
  - [x] 2.1 从 HostelContext 读取 promotions，筛选匹配的活跃促销
  - [x] 2.2 计算 promoDiscount 并纳入总价
  - [x] 2.3 确认页显示促销折扣明细

- [x] Task 3: Dashboard "创建促销"跳转自动展开表单
  - [x] 3.1 App.tsx navigateToGrow 扩展支持 autoOpenPromo 参数
  - [x] 3.2 GrowPanel 接收并透传 autoOpenPromo 给 RevenueBoost
  - [x] 3.3 RevenueBoost useEffect 自动展开促销表单

- [x] Task 4: HostelPage 浮动 Book Now 按钮
  - [x] 4.1 封面图右下角叠加 emerald 浮动 Book Now 按钮

- [x] Task 5: GrowPanel 子标签切换动画
  - [x] 5.1 AnimatePresence + motion.div 包裹子标签内容

- [x] Task 6: ReferralPanel 推荐码生成后自动复制
  - [x] 6.1 handleGenerate 后自动 clipboard.writeText + copiedCode 状态

# Task Dependencies
- Task 1 和 Task 2 可并行
- Task 3 依赖 App.tsx 的 navigateToGrow 机制
- Task 4, 5, 6 独立
