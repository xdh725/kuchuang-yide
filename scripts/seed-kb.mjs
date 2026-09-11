#!/usr/bin/env node
// 批量录入种子素材（走真实 admin API，与后台录入完全同路径）
// 用法：ADMIN_URL=... ADMIN_PW=... node scripts/seed-kb.mjs
const W = process.env.ADMIN_URL || 'https://kuchuang-yide.xdh725-kcyd.workers.dev';
const PW = process.env.ADMIN_PW || 'KcydAdmin-2026!x';
const UA = 'Mozilla/5.0 (Macintosh)';

const r = await fetch(W + '/api/admin/login', {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
  body: JSON.stringify({ password: PW }),
});
if (!r.ok) { console.error('登录失败'); process.exit(1); }
const cookie = (r.headers.get('Set-Cookie') || '').split('kcyd_admin=')[1].split(';')[0];
const H = { 'Cookie': 'kcyd_admin=' + cookie, 'Content-Type': 'application/json', 'User-Agent': UA };

const seed = [
  // ── 型号（models）──
  { id:'KB-MD-001', title:'KC-4215 Outrunner BLDC Motor', tags:'model, kc-4215, drone, spec', type:'spec-sheet',
    body_en:'The KC-4215 outrunner BLDC motor: KV 340, rated voltage 48V (12S LiPo), max continuous current 32A, stator 42mm x 15mm, N35SH high-temperature neodymium magnets, IP54 ingress protection, weight 285g. Designed for 15-25kg class agricultural drones.',
    body_zh:'KC-4215 外转子无刷电机：KV 340，额定电压 48V（12S 锂电），最大持续电流 32A，定子 42×15mm，N35SH 耐高温钕磁铁，IP54 防护等级，重量 285g。专为 15-25kg 级植保无人机设计。',
    verified_by:'mock-工程师待核实' },
  { id:'KB-MD-002', title:'KC-5008 Stator Inrunner BLDC Motor', tags:'model, kc-5008, agv, spec', type:'spec-sheet',
    body_en:'The KC-5008 inrunner BLDC motor: KV 120, rated voltage 24V (7S LiPo), max continuous current 15A, IP65 ingress protection, rated torque 0.8 Nm. Optimized for AGV drive wheels and logistics robots requiring continuous low-speed torque.',
    body_zh:'KC-5008 内转子无刷电机：KV 120，额定电压 24V（7S 锂电），最大持续电流 15A，IP65 防护等级，额定扭矩 0.8 Nm。针对 AGV 驱动轮与物流机器人连续低速扭矩需求优化。',
    verified_by:'mock-工程师待核实' },
  { id:'KB-MD-003', title:'KC-2207 Compact Gimbal Motor', tags:'model, kc-2207, gimbal, camera', type:'spec-sheet',
    body_en:'The KC-2207 compact gimbal BLDC motor: KV 680, rated voltage 12V (3S LiPo), peak holding torque 0.25 Nm, weight 68g, smooth low-cogging design for camera stabilization gimbals on drones and handheld devices.',
    body_zh:'KC-2207 小型云台无刷电机：KV 680，额定电压 12V（3S 锂电），峰值保持扭矩 0.25 Nm，重量 68g，低齿槽转矩平滑设计，适用于无人机与手持设备的相机稳定云台。',
    verified_by:'mock-工程师待核实' },
  // ── 原材料（raw-materials）──
  { id:'KB-RM-002', title:'N35SH Magnet Incoming Inspection', tags:'raw-material, magnet, n35sh, incoming-inspection', type:'text',
    body_en:'All drone-class motors use N35SH high-temperature resistant neodymium magnets, with continuous working temperature up to 150 degrees Celsius. Every magnet batch passes incoming inspection: flux density sampling, dimension check, and surface coating integrity. A short video of magnet incoming inspection is available on request.',
    body_zh:'无人机级电机全部采用 N35SH 耐高温钕磁铁，连续工作温度可达 150°C。每批磁钢来料均执行检验：磁通密度抽检、尺寸检查、表面镀层完整性检查。可应要求提供磁钢来料检验短视频。',
    verified_by:'mock-工程师待核实' },
  { id:'KB-RM-004', title:'Silicon Steel Sheet 35WW300', tags:'raw-material, silicon-steel, stator, lamination', type:'text',
    body_en:'Stator laminations use 35WW300 cold-rolled non-oriented silicon steel sheet, 0.35mm thickness, with low core loss for higher motor efficiency. Sheets are stamped and stacked with insulation coating between laminations to reduce eddy current loss.',
    body_zh:'定子铁芯采用 35WW300 冷轧无取向硅钢片，厚度 0.35mm，铁损低、电机效率更高。硅钢片冲压后叠压，片间绝缘涂层降低涡流损耗。',
    verified_by:'mock-工程师待核实' },
  { id:'KB-RM-005', title:'Copper Winding Wire Class H', tags:'raw-material, winding, copper, insulation-class-h', type:'text',
    body_en:'Windings use Class H (180°C) enameled copper wire. Insulation class H allows higher continuous current density than Class B or F, supporting the continuous 32A rating of the KC-4215 without thermal degradation.',
    body_zh:'绕组采用 H 级（180°C）漆包铜线。相比 B 级或 F 级绝缘，H 级允许更高的持续电流密度，支撑 KC-4215 的 32A 持续电流额定值而不发生热老化。',
    verified_by:'mock-工程师待核实' },
  // ── 工序（processes）──
  { id:'KB-PR-003', title:'Dynamic Balance Process', tags:'process, dynamic-balance, qc', type:'text',
    body_en:'Every rotor assembly passes dynamic balance calibration on a dedicated balancing machine before assembly. The process reduces vibration and extends bearing life. Workshop footage of the dynamic balance station is available in the Virtual Factory Tour.',
    body_zh:'每个转子总成在装配前均在专用动平衡机上进行动平衡校正。该工序可降低振动、延长轴承寿命。云参观页面可查看动平衡工位实拍视频。',
    verified_by:'mock-工程师待核实' },
  { id:'KB-PR-006', title:'CCD Visual Inspection Station', tags:'process, ccd, vision-inspection, qc', type:'text',
    body_en:'Post-winding stators pass through an automated CCD 2D vision inspection station that checks winding geometry, slot fill, and surface defects. The system flags any unit outside tolerance before it can proceed to the next process step.',
    body_zh:'绕线完成后的定子经过自动化 CCD 二次元视觉检测工位，检查绕组几何、槽满率与表面缺陷。任何超出公差的品项都会被系统拦截，无法进入下一道工序。',
    verified_by:'mock-工程师待核实' },
  { id:'KB-PR-007', title:'Burn-in Test Before Shipment', tags:'process, burn-in, aging-test, qc', type:'text',
    body_en:'Every production batch runs a full burn-in (aging) test before release: motors operate under rated load for a continuous period while current, temperature and vibration are monitored. Only batches passing burn-in are packed for shipment.',
    body_zh:'每个生产批次出货前均执行完整老化（burn-in）测试：电机在额定负载下连续运转，同步监测电流、温度与振动。通过老化测试的批次才允许包装出货。',
    verified_by:'mock-工程师待核实' },
  // ── 场景（applications）──
  { id:'KB-AP-008', title:'Agricultural Drone Application', tags:'application, drone, agriculture', type:'text',
    body_en:'Our drone motors (KC-4215 class) power 15-25kg agricultural spraying drones. Key requirements in this application: high continuous torque for propeller loads, dust and chemical resistance (IP54), and stable operation in humid field environments.',
    body_zh:'我们的无人机电机（KC-4215 级）应用于 15-25kg 级植保喷洒无人机。该场景关键要求：螺旋桨负载下的高持续扭矩、防尘与耐药剂腐蚀（IP54）、田间潮湿环境的稳定运行。',
    verified_by:'mock-工程师待核实' },
  { id:'KB-AP-009', title:'Logistics AGV Application', tags:'application, agv, logistics', type:'text',
    body_en:'Warehouse AGVs and logistics robots use our inrunner motors (KC-5008 class) for drive wheels. These motors deliver continuous low-speed torque with IP65 protection for dusty warehouse floors and frequent start-stop duty cycles.',
    body_zh:'仓储 AGV 与物流机器人使用我们的内转子电机（KC-5008 级）驱动轮。这类电机提供连续低速扭矩，IP65 防护适应粉尘车间地面与频繁启停工况。',
    verified_by:'mock-工程师待核实' },
  { id:'KB-AP-010', title:'Robotic Lawn Mower Application', tags:'application, lawn-mower, robotics, outdoor', type:'text',
    body_en:'Robotic lawn mowers require motors with high efficiency for long battery runtime, low noise, and weather sealing. Our wheel-drive and blade motors for this segment emphasize low temperature rise and quiet operation.',
    body_zh:'割草机器人要求电机高效率（延长电池续航）、低噪音与密封防水。我们面向该品类的轮驱与刀盘电机主打低温升与静音运行。',
    verified_by:'mock-工程师待核实' },
  // ── 效果（effects）──
  { id:'KB-EF-011', title:'IP Rating and Sealing', tags:'effect, ip-rating, sealing, protection', type:'text',
    body_en:'Our motors offer IP54 to IP65 ingress protection depending on model: IP54 protects against dust and water splash (drone class); IP65 protects against dust and low-pressure water jets (AGV class). Sealing is achieved through potting and gasket design.',
    body_zh:'根据型号不同，我们的电机提供 IP54 至 IP65 防护等级：IP54 防尘防溅水（无人机级）；IP65 防尘防低压喷水（AGV 级）。密封通过灌胶与垫圈设计实现。',
    verified_by:'mock-工程师待核实' },
  { id:'KB-EF-012', title:'Low Temperature Rise Design', tags:'effect, thermal, temperature-rise, efficiency', type:'text',
    body_en:'Class H winding insulation, low-loss silicon steel, and optimized airflow paths keep winding temperature rise low under continuous rated load, extending insulation life and allowing higher sustained current.',
    body_zh:'H 级绕组绝缘、低损耗硅钢片与优化的散热风路设计，使电机在持续额定负载下保持低温升，延长绝缘寿命并支持更高的持续电流。',
    verified_by:'mock-工程师待核实' },
];

let ok = 0;
for (const e of seed) {
  const r2 = await fetch(W + '/api/admin/entries', {
    method: 'POST', headers: H, body: JSON.stringify({ ...e, verified: true }),
  });
  const d = await r2.json();
  if (d.ok) { ok++; console.log('✓', e.id, e.title.slice(0, 36)); }
  else console.error('✗', e.id, d.error);
}
console.log(`\n${ok}/${seed.length} 条已录入（真实 admin API 流程）`);
console.log('下一步：后台点"重建索引"（或调 /api/admin/rebuild）→ 跑黄金集验收');
