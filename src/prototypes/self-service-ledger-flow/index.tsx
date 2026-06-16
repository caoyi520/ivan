/**
 * @name 猪哥云自助导账系统
 * @mode axure
 *
 * 参考资料：
 * - /Users/caoyi/Downloads/猪哥云自助导账系统.html
 * - /src/docs/猪哥云自助导账系统产品设计流程.md
 * - /rules/design-guide.md
 * - /rules/development-guide.md
 * - /src/prototypes/self-service-ledger-flow/spec.md
 */

import './style.css';
import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ClipboardList,
  Database,
  Eye,
  FileCheck2,
  LayoutDashboard,
  ListChecks,
  LockKeyhole,
  LogOut,
  RefreshCw,
  Rocket,
  Search,
  ShieldCheck,
  UserCircle,
  X
} from 'lucide-react';

import type {
  Action,
  AxureHandle,
  AxureProps,
  ConfigItem,
  DataDesc,
  EventItem,
  KeyDesc
} from '../../common/axure-types';

type PageKey = 'dashboard' | 'source' | 'collect' | 'detail' | 'config' | 'progress';
type WorkspaceTab = 'records' | 'collectDetail' | 'config' | 'migrationDetail';
type Status = 'pending' | 'collecting' | 'collect_failed' | 'collect_success' | 'collect_partial' | 'migrating' | 'migrate_failed' | 'migrate_success' | 'migrate_partial';
type MigrationMode = 'skip' | 'cover';
type MatchMode = 'name' | 'code' | 'both';
type CollectStatus = Extract<Status, 'pending' | 'collecting' | 'collect_failed' | 'collect_success' | 'collect_partial'>;
type MigrationStatus = Extract<Status, 'pending' | 'migrating' | 'migrate_failed' | 'migrate_success' | 'migrate_partial'>;

type LedgerItem = {
  id: string;
  ledgerName: string;
  companyName: string;
  creditCode: string;
  taxType: string;
  accountingStandard: string;
  sourceSoftware: string;
  period: string;
  voucherCount: number;
  invoiceCount: number;
  amount: string;
  risk?: string;
  migratable: boolean;
};

type RecordItem = {
  id: string;
  source: string;
  target: string;
  company: string;
  status: Status;
  ledgers: number;
  updatedAt: string;
  owner: string;
  detail: string;
};

type DetailPayload = {
  title: string;
  subtitle: string;
  sections: Array<{ title: string; rows: Array<[string, string]> }>;
  actions?: string[];
};

type StatusStage = {
  title: string;
  desc: string;
  result: string;
  owner: string;
  updatedAt: string;
};

type CollectRecord = {
  id: string;
  software: string;
  merchant: string;
  startTime: string;
  endTime: string;
  status: CollectStatus;
  desc: string;
};

type OperationLog = {
  content: string;
  time: string;
};

type MigratedLedger = {
  id: string;
  sourceLedger: string;
  targetLedger: string;
  company: string;
  targetCode: string;
  period: string;
  voucherCount: number;
  invoiceCount: number;
  attachmentCount: number;
  amount: string;
  completedAt: string;
};

const EVENT_LIST: EventItem[] = [
  { name: 'on_page_change', desc: '切换功能页面', payload: '页面 key' },
  { name: 'on_login_submit', desc: '提交登录', payload: '登录账号 JSON 字符串' },
  { name: 'on_record_detail_open', desc: '打开记录详情', payload: '记录 JSON 字符串' },
  { name: 'on_ledger_detail_open', desc: '打开账套详情', payload: '账套 JSON 字符串' },
  { name: 'on_collect_submit', desc: '提交采集授权', payload: '授权 JSON 字符串' },
  { name: 'on_migration_submit', desc: '提交迁移', payload: '迁移配置 JSON 字符串' },
  { name: 'on_config_change', desc: '修改迁移配置', payload: '迁移配置 JSON 字符串' }
];

const ACTION_LIST: Action[] = [
  { name: 'login', desc: '登录系统', params: '账号 JSON 字符串' },
  { name: 'logout', desc: '退出登录' },
  { name: 'go_page', desc: '切换页面', params: '页面 key' },
  { name: 'open_record_detail', desc: '打开记录详情', params: '记录 id' },
  { name: 'open_ledger_detail', desc: '打开账套详情', params: '账套 id' },
  { name: 'submit_collect', desc: '提交采集授权' },
  { name: 'submit_migration', desc: '提交迁移' }
];

const VAR_LIST: KeyDesc[] = [
  { name: 'logged_in', desc: '是否已登录' },
  { name: 'active_page', desc: '当前页面' },
  { name: 'selected_ledgers', desc: '已选择账套' },
  { name: 'match_mode', desc: '匹配方式' },
  { name: 'migration_mode', desc: '迁移方式' },
  { name: 'selected_contents', desc: '已选择迁移内容' }
];

const CONFIG_LIST: ConfigItem[] = [
  { type: 'input', attributeId: 'title', displayName: '系统名称', initialValue: '猪哥云自助导账系统' },
  { type: 'checkbox', attributeId: 'defaultLoggedIn', displayName: '默认已登录', initialValue: false }
];

const DATA_LIST: DataDesc[] = [
  {
    name: 'ledgers',
    desc: '账套明细',
    keys: [
      { name: 'id', desc: '账套唯一标识' },
      { name: 'ledgerName', desc: '账套名称' },
      { name: 'companyName', desc: '企业名称' },
      { name: 'creditCode', desc: '统一社会信用代码' },
      { name: 'taxType', desc: '纳税性质' },
      { name: 'accountingStandard', desc: '会计准则' },
      { name: 'risk', desc: '异常说明' },
      { name: 'migratable', desc: '是否可迁移' }
    ]
  }
];

const pages: Array<{ key: PageKey; title: string; desc: string; icon: React.ElementType }> = [
  { key: 'dashboard', title: '工作台', desc: '查看导账记录与待办', icon: LayoutDashboard },
  { key: 'source', title: '新建采集', desc: '连接源财务软件', icon: Database },
  { key: 'collect', title: '采集记录', desc: '查看采集结果', icon: ClipboardList },
  { key: 'detail', title: '账套确认', desc: '核对账套资料', icon: FileCheck2 },
  { key: 'config', title: '迁移设置', desc: '配置规则与范围', icon: ListChecks },
  { key: 'progress', title: '处理进度', desc: '查看迁移结果', icon: BarChart3 }
];

const defaultLedgers: LedgerItem[] = [
  {
    id: 'L-1001',
    ledgerName: '上海合云科技 2026 账套',
    companyName: '上海合云科技有限公司',
    creditCode: '91310115MA1K3X8A9Q',
    taxType: '一般纳税人',
    accountingStandard: '小企业会计准则',
    sourceSoftware: '猪哥云',
    period: '2026-01 至 2026-05',
    voucherCount: 1286,
    invoiceCount: 4521,
    amount: '¥8,426,930.22',
    migratable: true
  },
  {
    id: 'L-1002',
    ledgerName: '杭州北辰贸易账套',
    companyName: '杭州北辰贸易有限公司',
    creditCode: '91330108MA2B7K9M2X',
    taxType: '小规模纳税人',
    accountingStandard: '企业会计准则',
    sourceSoftware: '猪哥云',
    period: '2025-10 至 2026-05',
    voucherCount: 732,
    invoiceCount: 1908,
    amount: '¥2,916,540.80',
    migratable: true
  },
  {
    id: 'L-1003',
    ledgerName: '深圳云帆供应链账套',
    companyName: '深圳云帆供应链有限公司',
    creditCode: '',
    taxType: '一般纳税人',
    accountingStandard: '企业会计准则',
    sourceSoftware: '猪哥云',
    period: '2026-01 至 2026-05',
    voucherCount: 946,
    invoiceCount: 3772,
    amount: '¥12,408,690.10',
    risk: '统一社会信用代码缺失，需要补充后再迁移。',
    migratable: false
  },
  {
    id: 'L-1004',
    ledgerName: '成都青禾餐饮 2025 账套',
    companyName: '成都青禾餐饮管理有限公司',
    creditCode: '91510104MA6C8Q2N7P',
    taxType: '小规模纳税人',
    accountingStandard: '民间非营利组织会计制度',
    sourceSoftware: '亿企赢',
    period: '2025-01 至 2025-12',
    voucherCount: 421,
    invoiceCount: 628,
    amount: '¥746,210.00',
    risk: '当前会计制度需要人工确认映射关系。',
    migratable: false
  }
];

const defaultRecords: RecordItem[] = [
  {
    id: 'ZG-20260616-001',
    source: '猪哥云',
    target: '财税合规 AI 服务系统',
    company: '上海合云服务商',
    status: 'pending',
    ledgers: 4,
    updatedAt: '2026-06-16 11:40',
    owner: '张楠',
    detail: '源系统尚未完成连接，等待提交采集信息。'
  },
  {
    id: 'ZG-20260616-002',
    source: '猪哥云',
    target: '财税合规 AI 服务系统',
    company: '上海合云服务商',
    status: 'collecting',
    ledgers: 4,
    updatedAt: '2026-06-16 11:47',
    owner: '张楠',
    detail: '正在采集企业主体、凭证、发票和附件目录。'
  },
  {
    id: 'ZG-20260616-005',
    source: '猪哥云',
    target: '财税合规 AI 服务系统',
    company: '深圳云帆供应链有限公司',
    status: 'collect_failed',
    ledgers: 0,
    updatedAt: '2026-06-16 11:44',
    owner: '张楠',
    detail: '源系统账号缺少凭证和附件读取权限。'
  },
  {
    id: 'ZG-20260616-004',
    source: '猪哥云',
    target: '财税合规 AI 服务系统',
    company: '上海合云科技有限公司',
    status: 'collect_success',
    ledgers: 4,
    updatedAt: '2026-06-16 12:08',
    owner: '张楠',
    detail: '采集成功，可查看采集详情并进入迁移配置。'
  },
  {
    id: 'ZG-20260615-006',
    source: '亿企赢',
    target: '猪哥云',
    company: '杭州北辰贸易有限公司',
    status: 'collect_partial',
    ledgers: 3,
    updatedAt: '2026-06-15 17:22',
    owner: '李敏',
    detail: '部分采集成功，可查看采集详情并选择成功账套迁移。'
  },
  {
    id: 'ZG-20260615-009',
    source: '财税合规 AI 服务系统',
    target: '猪哥云',
    company: '苏州明远财税服务有限公司',
    status: 'migrating',
    ledgers: 2,
    updatedAt: '2026-06-15 18:10',
    owner: '李敏',
    detail: '目标系统授权已通过，正在写入凭证和发票。'
  },
  {
    id: 'ZG-20260615-011',
    source: '亿企赢',
    target: '猪哥云',
    company: '宁波润成咨询有限公司',
    status: 'migrate_failed',
    ledgers: 2,
    updatedAt: '2026-06-15 18:42',
    owner: '王霖',
    detail: '目标系统未找到匹配企业，迁移未执行写入。'
  },
  {
    id: 'ZG-20260615-013',
    source: '猪哥云',
    target: '亿企赢',
    company: '深圳云帆供应链有限公司',
    status: 'migrate_partial',
    ledgers: 3,
    updatedAt: '2026-06-15 19:18',
    owner: '王霖',
    detail: '部分账套已迁移成功，附件仍需分批处理。'
  },
  {
    id: 'ZG-20260614-012',
    source: '猪哥云',
    target: '亿企赢',
    company: '成都青禾餐饮管理有限公司',
    status: 'migrate_success',
    ledgers: 1,
    updatedAt: '2026-06-14 19:05',
    owner: '王霖',
    detail: '账套、凭证、发票和附件均已迁移完成。'
  }
];

const contentGroups = [
  { title: '记账单据', items: ['销项发票', '进项发票', '费用报销', '无票收入', '银行', '工资', '其他单据'] },
  { title: '财务数据', items: ['财务初始余额', '会计科目', '记账凭证', '辅助核算'] },
  { title: '其他资料', items: ['币别', '附件', '小计', '银行账户', '操作日志'] },
  { title: '扩展数据', items: ['库存', '资产'] }
];

const defaultContents = ['销项发票', '进项发票', '费用报销', '银行', '财务初始余额', '会计科目', '记账凭证', '辅助核算', '附件', '银行账户'];

const collectStatusViews: Record<CollectStatus, {
  summary: string;
  metrics: Array<[string, string, string]>;
  records: CollectRecord[];
}> = {
  pending: {
    summary: '等待提交源财务软件连接信息，当前仅保留待采集记录，提交后生成采集起止时间和状态。',
    metrics: [['待采集记录', '1', '等待源系统授权'], ['可操作记录', '0', '待采集不可查看采集详情'], ['最近更新', '11:40', '等待提交采集信息']],
    records: [
      { id: 'C-20260616-001', software: '猪哥云', merchant: '上海合云服务商', startTime: '待开始', endTime: '待完成', status: 'pending', desc: '源系统尚未提交连接信息。' }
    ]
  },
  collecting: {
    summary: '采集正在进行中，记录仅用于查看采集对象、起止时间和当前状态，完成前不可进入后续操作。',
    metrics: [['采集中记录', '2', '系统正在读取源数据'], ['可操作记录', '0', '采集中不可查看采集详情'], ['平均耗时', '18 分钟', '按当前运行记录估算']],
    records: [
      { id: 'C-20260616-002', software: '猪哥云', merchant: '上海合云服务商', startTime: '2026-06-16 11:42', endTime: '进行中', status: 'collecting', desc: '正在采集企业主体和财务资料。' },
      { id: 'C-20260616-003', software: '亿企赢', merchant: '杭州北辰贸易有限公司', startTime: '2026-06-16 11:51', endTime: '进行中', status: 'collecting', desc: '正在读取源软件授权范围。' }
    ]
  },
  collect_success: {
    summary: '采集已成功完成，可从记录查看采集详情，并选择成功账套进入迁移配置。',
    metrics: [['采集成功记录', '3', '可查看采集详情'], ['可操作记录', '3', '支持后续导账操作'], ['最近完成', '12:08', '上海合云服务商']],
    records: [
      { id: 'C-20260616-004', software: '猪哥云', merchant: '上海合云服务商', startTime: '2026-06-16 11:42', endTime: '2026-06-16 12:08', status: 'collect_success', desc: '采集成功，可查看采集详情。' },
      { id: 'C-20260615-018', software: '财税合规 AI 服务系统', merchant: '苏州明远财税服务有限公司', startTime: '2026-06-15 14:10', endTime: '2026-06-15 14:38', status: 'collect_success', desc: '采集成功，可查看采集详情。' },
      { id: 'C-20260614-021', software: '亿企赢', merchant: '成都青禾餐饮管理有限公司', startTime: '2026-06-14 18:20', endTime: '2026-06-14 18:47', status: 'collect_success', desc: '采集成功，可查看采集详情。' }
    ]
  },
  collect_partial: {
    summary: '部分采集成功，可查看采集详情，先选择成功账套进入迁移配置。',
    metrics: [['部分成功记录', '2', '可查看采集详情'], ['可操作记录', '2', '支持后续导账操作'], ['待补充记录', '2', '需在采集详情中查看']],
    records: [
      { id: 'C-20260615-006', software: '亿企赢', merchant: '杭州北辰贸易有限公司', startTime: '2026-06-15 16:50', endTime: '2026-06-15 17:22', status: 'collect_partial', desc: '部分采集成功，可查看采集详情处理可用范围。' },
      { id: 'C-20260613-009', software: '猪哥云', merchant: '深圳云帆供应链有限公司', startTime: '2026-06-13 09:30', endTime: '2026-06-13 10:04', status: 'collect_partial', desc: '部分采集成功，可查看采集详情处理可用范围。' }
    ]
  },
  collect_failed: {
    summary: '采集失败记录仅用于查看失败对象和时间，需重新提交采集后才可进入后续操作。',
    metrics: [['采集失败记录', '2', '不可查看采集详情'], ['可操作记录', '0', '需重新提交采集'], ['最近失败', '11:44', '源账号权限不足']],
    records: [
      { id: 'C-20260616-005', software: '猪哥云', merchant: '深圳云帆供应链有限公司', startTime: '2026-06-16 11:43', endTime: '2026-06-16 11:44', status: 'collect_failed', desc: '源系统账号权限不足。' },
      { id: 'C-20260615-011', software: '财税合规 AI 服务系统', merchant: '宁波润成咨询有限公司', startTime: '2026-06-15 10:12', endTime: '2026-06-15 10:14', status: 'collect_failed', desc: '源系统连接信息校验失败。' }
    ]
  }
};

const migrationStatusViews: Record<MigrationStatus, {
  summary: string;
  progress: number;
  metrics: Array<[string, string, string]>;
  stages: StatusStage[];
}> = {
  pending: {
    summary: '尚未提交迁移，请先确认账套、匹配方式、迁移方式和目标软件授权。',
    progress: 0,
    metrics: [['目标授权', '待提交', '迁移设置完成后校验'], ['账套范围', '未锁定', '请先选择可迁移账套'], ['结果明细', '未生成', '提交后可查看']],
    stages: [
      { title: '目标授权校验', desc: '等待目标软件账号信息。', result: '未开始', owner: '系统', updatedAt: '待更新' },
      { title: '账套匹配', desc: '等待迁移范围和匹配方式。', result: '未开始', owner: '系统', updatedAt: '待更新' },
      { title: '数据写入', desc: '提交迁移后写入目标系统。', result: '未开始', owner: '系统', updatedAt: '待更新' }
    ]
  },
  migrating: {
    summary: '迁移正在执行，目标授权已通过，系统正在按账套写入凭证、发票、科目和附件目录。',
    progress: 64,
    metrics: [['已写入账套', '1', '剩余账套继续处理'], ['已写入凭证', '1,286', '上海合云科技已完成'], ['当前步骤', '数据写入', '正在处理杭州北辰贸易']],
    stages: [
      { title: '目标授权校验', desc: '目标软件账号权限满足写入要求。', result: '已通过', owner: '系统', updatedAt: '2026-06-16 12:18' },
      { title: '账套匹配', desc: '按账套名称 + 统一社会信用代码匹配目标企业。', result: '已完成', owner: '系统', updatedAt: '2026-06-16 12:20' },
      { title: '数据写入', desc: '正在写入凭证、发票、初始余额和附件目录。', result: '处理中', owner: '系统', updatedAt: '2026-06-16 12:25' }
    ]
  },
  migrate_success: {
    summary: '迁移已完成，成功账套的目标账套编号、期间、凭证、发票和附件数量可逐项查看。',
    progress: 100,
    metrics: [['成功账套', '2', '均已通过结果校验'], ['写入凭证', '2,018', '凭证号连续'], ['写入发票', '6,429', '销项与进项均已写入']],
    stages: [
      { title: '目标授权校验', desc: '目标系统账号具备企业、账套、凭证和附件写入权限。', result: '已完成', owner: '系统', updatedAt: '2026-06-16 12:18' },
      { title: '账套匹配', desc: '2 个账套完成目标企业匹配。', result: '已完成', owner: '系统', updatedAt: '2026-06-16 12:20' },
      { title: '数据写入', desc: '凭证、发票、科目、余额和附件目录均已写入。', result: '已完成', owner: '系统', updatedAt: '2026-06-16 12:31' },
      { title: '结果校验', desc: '源系统与目标系统关键数量和金额一致。', result: '已通过', owner: '系统', updatedAt: '2026-06-16 12:35' }
    ]
  },
  migrate_partial: {
    summary: '部分账套已迁移成功，失败或待确认项需要处理后重新提交。',
    progress: 82,
    metrics: [['成功账套', '1', '上海合云科技已完成'], ['待处理账套', '1', '杭州北辰贸易附件待分批'], ['可查看明细', '1', '成功账套可打开核对']],
    stages: [
      { title: '目标授权校验', desc: '目标软件账号权限正常。', result: '已完成', owner: '系统', updatedAt: '2026-06-16 12:18' },
      { title: '账套匹配', desc: '2 个账套完成匹配。', result: '已完成', owner: '系统', updatedAt: '2026-06-16 12:20' },
      { title: '附件写入', desc: '杭州北辰贸易附件体积较大，需要分批写入。', result: '待处理', owner: '王霖', updatedAt: '2026-06-16 12:32' }
    ]
  },
  migrate_failed: {
    summary: '迁移未完成，目标软件授权或账套匹配结果存在阻断项。',
    progress: 48,
    metrics: [['失败节点', '账套匹配', '目标企业不存在'], ['成功账套', '0', '未进入数据写入'], ['处理建议', '补充目标企业', '确认后重新提交']],
    stages: [
      { title: '目标授权校验', desc: '目标软件账号可登录且具备读取权限。', result: '已通过', owner: '系统', updatedAt: '2026-06-16 12:18' },
      { title: '账套匹配', desc: '目标系统未找到匹配企业。', result: '未通过', owner: '系统', updatedAt: '2026-06-16 12:20' },
      { title: '数据写入', desc: '匹配失败，未执行写入。', result: '未开始', owner: '系统', updatedAt: '待更新' }
    ]
  }
};

const migratedLedgerRows: MigratedLedger[] = [
  {
    id: 'T-L-8801',
    sourceLedger: '上海合云科技 2026 账套',
    targetLedger: '上海合云科技有限公司-2026',
    company: '上海合云科技有限公司',
    targetCode: 'HY-SH-2026-001',
    period: '2026-01 至 2026-05',
    voucherCount: 1286,
    invoiceCount: 4521,
    attachmentCount: 845,
    amount: '¥8,426,930.22',
    completedAt: '2026-06-16 12:32'
  },
  {
    id: 'T-L-8802',
    sourceLedger: '杭州北辰贸易账套',
    targetLedger: '杭州北辰贸易有限公司-主账套',
    company: '杭州北辰贸易有限公司',
    targetCode: 'HY-HZ-2026-014',
    period: '2025-10 至 2026-05',
    voucherCount: 732,
    invoiceCount: 1908,
    attachmentCount: 312,
    amount: '¥2,916,540.80',
    completedAt: '2026-06-16 12:35'
  }
];

function safePayload(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function statusMeta(status: Status) {
  const map: Record<Status, { label: string; tone: 'neutral' | 'ok' | 'warn' | 'bad' | 'info' }> = {
    pending: { label: '待处理', tone: 'neutral' },
    collecting: { label: '采集中', tone: 'info' },
    collect_failed: { label: '采集失败', tone: 'bad' },
    collect_success: { label: '采集成功', tone: 'ok' },
    collect_partial: { label: '部分采集成功', tone: 'warn' },
    migrating: { label: '迁移中', tone: 'info' },
    migrate_failed: { label: '迁移失败', tone: 'bad' },
    migrate_success: { label: '迁移成功', tone: 'ok' },
    migrate_partial: { label: '部分迁移成功', tone: 'warn' }
  };
  return map[status];
}

function badgeClass(tone: 'neutral' | 'ok' | 'warn' | 'bad' | 'info') {
  if (tone === 'ok') return 'badge badge--ok';
  if (tone === 'warn') return 'badge badge--warn';
  if (tone === 'bad') return 'badge badge--bad';
  if (tone === 'info') return 'badge';
  return 'badge badge--neutral';
}

function recordToDetail(record: RecordItem): DetailPayload {
  const meta = statusMeta(record.status);
  return {
    title: record.id,
    subtitle: record.detail,
    sections: [
      {
        title: '基础信息',
        rows: [
          ['服务商/企业', record.company],
          ['源财务软件', record.source],
          ['目标财务软件', record.target],
          ['当前状态', meta.label]
        ]
      },
      {
        title: '处理信息',
        rows: [
          ['账套数量', `${record.ledgers} 个`],
          ['负责人', record.owner],
          ['最近更新', record.updatedAt],
          ['下一步', record.status === 'pending' ? '新建采集' : record.status.includes('success') ? '查看明细' : '处理异常']
        ]
      }
    ],
    actions: ['查看关联账套', '导出处理记录', '联系负责人']
  };
}

function ledgerToDetail(ledger: LedgerItem): DetailPayload {
  return {
    title: ledger.ledgerName,
    subtitle: ledger.risk ?? '账套资料完整，可纳入本次迁移。',
    sections: [
      {
        title: '企业识别',
        rows: [
          ['企业名称', ledger.companyName],
          ['统一社会信用代码', ledger.creditCode || '待补充'],
          ['纳税性质', ledger.taxType],
          ['会计准则', ledger.accountingStandard]
        ]
      },
      {
        title: '数据概览',
        rows: [
          ['所属期间', ledger.period],
          ['凭证数量', `${ledger.voucherCount} 条`],
          ['发票数量', `${ledger.invoiceCount} 张`],
          ['金额合计', ledger.amount]
        ]
      }
    ],
    actions: ledger.migratable ? ['加入迁移范围', '查看数据清单'] : ['补充资料', '标记暂不迁移']
  };
}

const Component = forwardRef<AxureHandle, AxureProps>(function SelfServiceLedgerFlow(innerProps, ref) {
  const dataSource = innerProps?.data ?? {};
  const configSource = innerProps?.config ?? {};
  const onEventHandler = typeof innerProps?.onEvent === 'function' ? innerProps.onEvent : undefined;

  const ledgers = Array.isArray(dataSource.ledgers) && dataSource.ledgers.length > 0
    ? dataSource.ledgers as LedgerItem[]
    : defaultLedgers;
  const title = typeof configSource.title === 'string' ? configSource.title : '猪哥云自助导账系统';

  const [loggedIn, setLoggedIn] = useState(configSource.defaultLoggedIn === true);
  const [activePage, setActivePage] = useState<PageKey>('dashboard');
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('records');
  const [loginAccount, setLoginAccount] = useState('finance_admin');
  const [loginPassword, setLoginPassword] = useState('');
  const [sourceSoftware, setSourceSoftware] = useState('猪哥云');
  const [targetSoftware, setTargetSoftware] = useState('财税合规 AI 服务系统');
  const [merchant, setMerchant] = useState('上海合云服务商');
  const [sourceAccount, setSourceAccount] = useState('source_admin');
  const [collectStatus, setCollectStatus] = useState<Status>('pending');
  const [migrationStatus, setMigrationStatus] = useState<Status>('pending');
  const [selectedLedgers, setSelectedLedgers] = useState<string[]>(ledgers.filter((item) => item.migratable).map((item) => item.id));
  const [matchMode, setMatchMode] = useState<MatchMode>('both');
  const [migrationMode, setMigrationMode] = useState<MigrationMode>('skip');
  const [selectedContents, setSelectedContents] = useState<string[]>(defaultContents);
  const [records, setRecords] = useState<RecordItem[]>(defaultRecords);
  const [keyword, setKeyword] = useState('');
  const [recordStatusFilter, setRecordStatusFilter] = useState<Status | 'all'>('all');
  const [sortKey, setSortKey] = useState<keyof RecordItem>('updatedAt');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<RecordItem>(defaultRecords[0]);
  const [collectDetailTab, setCollectDetailTab] = useState<'success' | 'abnormal'>('success');
  const [migrationDetailTab, setMigrationDetailTab] = useState<'success' | 'abnormal'>('success');
  const [collectDrawerOpen, setCollectDrawerOpen] = useState(false);
  const [detail, setDetail] = useState<DetailPayload | null>(null);
  const [logs, setLogs] = useState<OperationLog[]>([
    { content: '系统已准备就绪，等待用户登录。', time: '2026-06-16 11:35' },
    { content: '最近一次安全检查通过。', time: '2026-06-16 11:30' }
  ]);

  useEffect(() => {
    document.title = title;
  }, [title]);

  const emit = (name: string, payload: unknown) => {
    onEventHandler?.(name, typeof payload === 'string' ? payload : safePayload(payload));
  };

  const appendLog = (content: string) => {
    const now = new Date();
    const time = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setLogs((prev) => [{ content, time }, ...prev].slice(0, 8));
  };

  const goPage = (page: PageKey) => {
    setActivePage(page);
    if (page === 'dashboard') setActiveTab('records');
    if (page === 'source') setCollectDrawerOpen(true);
    if (page === 'collect') setActiveTab('collectDetail');
    if (page === 'detail') setActiveTab('collectDetail');
    if (page === 'config') setActiveTab('config');
    if (page === 'progress') setActiveTab('migrationDetail');
    emit('on_page_change', page);
  };

  const openRecordWorkspace = (record: RecordItem) => {
    setSelectedRecord(record);
    if (record.status === 'collect_success' || record.status === 'collect_partial') {
      setCollectStatus(record.status as CollectStatus);
      setActiveTab('collectDetail');
      appendLog(`查看采集详情 ${record.id}`);
    } else if (record.status === 'migrate_success' || record.status === 'migrate_partial') {
      setMigrationStatus(record.status as MigrationStatus);
      setActiveTab('migrationDetail');
      appendLog(`查看迁移详情 ${record.id}`);
    }
    emit('on_record_detail_open', record);
  };

  const openDetail = (payload: DetailPayload, eventName = 'on_record_detail_open') => {
    setDetail(payload);
    emit(eventName, payload);
  };

  const submitLogin = () => {
    setLoggedIn(true);
    appendLog(`${loginAccount} 已登录系统。`);
    emit('on_login_submit', { account: loginAccount });
  };

  const logout = () => {
    setLoggedIn(false);
    setActivePage('dashboard');
    setActiveTab('records');
    setDetail(null);
  };

  const submitCollect = () => {
    const next: Status = 'collecting';
    setCollectStatus(next);
    setRecords((prev) => prev.map((item) => item.id === 'ZG-20260616-001'
      ? { ...item, source: sourceSoftware, target: targetSoftware, company: merchant, status: next, detail: '系统正在读取源软件账套、凭证、发票和基础资料。' }
      : item));
    appendLog(`已连接 ${sourceSoftware}，开始读取 ${merchant} 的账套资料。`);
    emit('on_collect_submit', { sourceSoftware, merchant, sourceAccount });
    setCollectDrawerOpen(false);
    setActiveTab('records');
  };

  const completeCollect = (status: Status) => {
    setCollectStatus(status);
    setRecords((prev) => prev.map((item) => item.id === 'ZG-20260616-001'
      ? { ...item, status, detail: status === 'collect_success' ? '4 个账套已读取完成，其中 2 个可直接迁移。' : '部分账套需要补充资料后再迁移。' }
      : item));
    appendLog(status === 'collect_success' ? '采集完成，已生成账套清单。' : '采集已返回，存在需要处理的账套。');
    goPage('detail');
  };

  const toggleLedger = (id: string) => {
    const ledger = ledgers.find((item) => item.id === id);
    if (!ledger?.migratable) {
      if (ledger) openDetail(ledgerToDetail(ledger), 'on_ledger_detail_open');
      return;
    }
    setSelectedLedgers((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  };

  const toggleContent = (item: string) => {
    const next = selectedContents.includes(item)
      ? selectedContents.filter((value) => value !== item)
      : [...selectedContents, item];
    setSelectedContents(next);
    emit('on_config_change', { selectedContents: next, matchMode, migrationMode });
  };

  const submitMigration = () => {
    setMigrationStatus('migrating');
    const updatedRecord: RecordItem = {
      ...selectedRecord,
      status: 'migrating',
      ledgers: selectedLedgers.length,
      updatedAt: '2026-06-16 16:20',
      detail: `已提交迁移，范围为 ${selectedLedgers.length} 个账套，等待迁移结果。`
    };
    setSelectedRecord(updatedRecord);
    setRecords((prev) => prev.map((item) => item.id === selectedRecord.id ? updatedRecord : item));
    appendLog(`已提交迁移，范围为 ${selectedLedgers.length} 个账套和 ${selectedContents.length} 类数据。`);
    emit('on_migration_submit', { selectedLedgers, selectedContents, matchMode, migrationMode, targetSoftware });
    setActiveTab('records');
  };

  const finishMigration = (status: Status) => {
    setMigrationStatus(status);
    appendLog(status === 'migrate_success' ? '迁移完成，明细和日志已生成。' : '迁移结果已返回，请查看失败项。');
  };

  const filteredRecords = records.filter((item) => {
    const source = `${item.id}${item.source}${item.target}${item.company}${item.detail}`;
    const matchKeyword = source.toLowerCase().includes(keyword.trim().toLowerCase());
    const matchStatus = recordStatusFilter === 'all' || item.status === recordStatusFilter;
    return matchKeyword && matchStatus;
  }).sort((left, right) => {
    const leftValue = String(left[sortKey]);
    const rightValue = String(right[sortKey]);
    return sortAsc ? leftValue.localeCompare(rightValue) : rightValue.localeCompare(leftValue);
  });

  const changeSort = (key: keyof RecordItem) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
      return;
    }
    setSortKey(key);
    setSortAsc(true);
  };

  const renderSortIcon = (key: keyof RecordItem) => {
    if (sortKey !== key) return <ChevronDown size={12} className="sort-muted" />;
    return sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  const recordActionLabel = (status: Status) => {
    if (status === 'collect_success' || status === 'collect_partial') return '查看采集详情';
    if (status === 'migrate_success' || status === 'migrate_partial') return '查看迁移详情';
    if (status === 'migrating') return '等待迁移结果';
    return '不可操作';
  };

  const canOpenRecord = (status: Status) => (
    status === 'collect_success'
    || status === 'collect_partial'
    || status === 'migrate_success'
    || status === 'migrate_partial'
  );

  const collectMeta = statusMeta(collectStatus);
  const migrationMeta = statusMeta(migrationStatus);

  const tabTitleMap: Record<WorkspaceTab, { title: string; desc: string }> = {
    records: { title: '导账工作台', desc: '查看全部导账记录，点击记录后在当前页查看对应采集详情或迁移详情。' },
    collectDetail: { title: '采集详情', desc: `${selectedRecord.id} · ${selectedRecord.company}` },
    config: { title: '迁移配置', desc: `${selectedRecord.id} · 已选择 ${selectedLedgers.length} 个账套` },
    migrationDetail: { title: '迁移详情', desc: `${selectedRecord.id} · ${selectedRecord.company}` }
  };
  const currentTabInfo = tabTitleMap[activeTab];
  const breadcrumbItems = activeTab === 'records'
    ? ['首页', '导账工作台']
    : ['首页', '导账工作台', currentTabInfo.title];
  useImperativeHandle(ref, () => ({
    getVar: (name: string) => {
      const vars: Record<string, unknown> = {
        logged_in: loggedIn,
        active_page: activePage,
        selected_ledgers: selectedLedgers,
        match_mode: matchMode,
        migration_mode: migrationMode,
        selected_contents: selectedContents
      };
      return vars[name];
    },
    fireAction: (name: string, params?: string) => {
      switch (name) {
        case 'login':
          submitLogin();
          break;
        case 'logout':
          logout();
          break;
        case 'go_page':
          if (params && pages.some((item) => item.key === params)) goPage(params as PageKey);
          break;
        case 'open_record_detail': {
          const record = records.find((item) => item.id === params);
          if (record) openDetail(recordToDetail(record));
          break;
        }
        case 'open_ledger_detail': {
          const ledger = ledgers.find((item) => item.id === params);
          if (ledger) openDetail(ledgerToDetail(ledger), 'on_ledger_detail_open');
          break;
        }
        case 'submit_collect':
          submitCollect();
          break;
        case 'submit_migration':
          submitMigration();
          break;
        default:
          break;
      }
    },
    eventList: EVENT_LIST,
    actionList: ACTION_LIST,
    varList: VAR_LIST,
    configList: CONFIG_LIST,
    dataList: DATA_LIST
  }));

  const renderLogin = () => (
    <main className="ledger-login-page">
      <section className="login-visual">
        <div className="login-brand-mark"><ShieldCheck size={30} /></div>
        <h1>{title}</h1>
        <p>连接源财务软件，核对账套资料，按规则迁移到目标系统。企业用户可在同一处完成授权、确认、迁移和结果追溯。</p>
        <div className="login-points">
          <span><CheckCircle2 size={16} />账套资料核对</span>
          <span><CheckCircle2 size={16} />迁移范围确认</span>
          <span><CheckCircle2 size={16} />结果明细追溯</span>
        </div>
      </section>
      <section className="login-card">
        <div>
          <span className="login-kicker">安全登录</span>
          <h2>登录导账系统</h2>
          <p>请使用企业分配的账号登录。</p>
        </div>
        <div className="field">
          <label>账号</label>
          <input value={loginAccount} onChange={(event) => setLoginAccount(event.target.value)} />
        </div>
        <div className="field">
          <label>密码</label>
          <input value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} type="password" placeholder="请输入密码" />
        </div>
        <button className="btn btn-primary login-submit" onClick={submitLogin}><LockKeyhole size={16} />登录</button>
        <p className="login-help">遇到账号或权限问题，请联系企业管理员。</p>
      </section>
    </main>
  );

  const renderDashboard = () => (
    <div className="config-section">
      <div className="metric-grid">
        <button className="metric-card metric-card--clickable" onClick={() => openDetail({
          title: '本月导账概览',
          subtitle: '用于查看当前账号下的整体导账处理情况。',
          sections: [{ title: '数据摘要', rows: [['导账记录', '18 条'], ['待处理记录', '5 条'], ['迁移成功率', '92%'], ['异常账套', '2 个']] }],
          actions: ['查看全部记录', '导出月度报表']
        })}>
          <span>导账记录</span><strong>18</strong><small>点击查看统计详情</small>
        </button>
        <button className="metric-card metric-card--clickable" onClick={() => setActiveTab('collectDetail')}>
          <span>待确认账套</span><strong>{ledgers.length}</strong><small>{ledgers.filter((item) => !item.migratable).length} 个需要处理</small>
        </button>
        <button className="metric-card metric-card--clickable" onClick={() => setActiveTab('migrationDetail')}>
          <span>处理成功率</span><strong>92%</strong><small>点击查看结果明细</small>
        </button>
      </div>
      <section className="operation-card">
        <div className="section-title">
          <h3>导账记录</h3>
          <div className="section-actions">
            <button className="btn btn-primary" onClick={() => setCollectDrawerOpen(true)}><Rocket size={16} />新建采集</button>
          </div>
        </div>
        <div className="table-toolbar">
          <div className="search-row">
            <Search size={16} />
            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索记录编号、企业、软件或说明" />
          </div>
          <select value={recordStatusFilter} onChange={(event) => setRecordStatusFilter(event.target.value as Status | 'all')} className="filter-select">
            <option value="all">全部状态</option>
            <option value="pending">待处理</option>
            <option value="collecting">采集中</option>
            <option value="collect_failed">采集失败</option>
            <option value="collect_success">采集成功</option>
            <option value="collect_partial">部分采集成功</option>
            <option value="migrating">迁移中</option>
            <option value="migrate_failed">迁移失败</option>
            <option value="migrate_partial">部分迁移成功</option>
            <option value="migrate_success">迁移成功</option>
          </select>
        </div>
        <div className="record-table-wrap">
          <table className="record-table">
            <thead>
              <tr>
                <th><button onClick={() => changeSort('id')}>记录编号 {renderSortIcon('id')}</button></th>
                <th><button onClick={() => changeSort('company')}>企业/服务商 {renderSortIcon('company')}</button></th>
                <th>迁移路径</th>
                <th><button onClick={() => changeSort('status')}>状态 {renderSortIcon('status')}</button></th>
                <th><button onClick={() => changeSort('ledgers')}>账套 {renderSortIcon('ledgers')}</button></th>
                <th><button onClick={() => changeSort('updatedAt')}>最近活动 {renderSortIcon('updatedAt')}</button></th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => {
                const meta = statusMeta(record.status);
                const canOpen = canOpenRecord(record.status);
                return (
                  <tr key={record.id} onClick={() => { if (canOpen) openRecordWorkspace(record); }}>
                    <td><strong>{record.id}</strong><span>{record.owner}</span></td>
                    <td><strong>{record.company}</strong><span>{record.detail}</span></td>
                    <td>{record.source} → {record.target}</td>
                    <td><span className={badgeClass(meta.tone)}>{meta.label}</span></td>
                    <td>{record.ledgers} 个</td>
                    <td>{record.updatedAt}</td>
                    <td>
                      {canOpen ? (
                        <button className="table-link" onClick={(event) => { event.stopPropagation(); openRecordWorkspace(record); }}>{recordActionLabel(record.status)}</button>
                      ) : (
                        <span className="disabled-action">{recordActionLabel(record.status)}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );

  const renderSource = () => (
    <section className="operation-card">
      <div className="section-title">
        <h3>连接源财务软件</h3>
        <button className="btn" onClick={() => openDetail({
          title: '连接说明',
          subtitle: '系统会依据所选软件读取可访问账套。',
          sections: [{ title: '所需权限', rows: [['账号权限', '可查看账套、凭证、发票和基础资料'], ['安全处理', '账号信息仅用于本次连接验证'], ['完成后', '进入采集记录查看结果']] }],
          actions: ['查看帮助文档', '联系管理员']
        })}><Eye size={15} />查看说明</button>
      </div>
      <div className="field-grid">
        <div className="field">
          <label>源财务软件</label>
          <select value={sourceSoftware} onChange={(event) => setSourceSoftware(event.target.value)}>
            <option>猪哥云</option>
            <option>财税合规 AI 服务系统</option>
            <option>亿企赢</option>
          </select>
        </div>
        <div className="field">
          <label>商户/服务商名称</label>
          <input value={merchant} onChange={(event) => setMerchant(event.target.value)} />
        </div>
        <div className="field">
          <label>源系统账号</label>
          <input value={sourceAccount} onChange={(event) => setSourceAccount(event.target.value)} />
        </div>
        <div className="field">
          <label>源系统密码</label>
          <input type="password" placeholder="请输入源系统密码" />
        </div>
      </div>
      <div className="button-row">
        <button className="btn" onClick={() => goPage('dashboard')}>返回工作台</button>
        <button className="btn btn-primary" onClick={submitCollect}><ArrowRight size={16} />提交采集</button>
      </div>
    </section>
  );

  const renderCollectDetail = () => {
    const successLedgers = ledgers.filter((item) => item.migratable);
    const abnormalLedgers = ledgers.filter((item) => !item.migratable);
    return (
      <div className="config-section">
        <section className="operation-card">
          <div className="section-title">
            <div>
              <h3>采集详情</h3>
              <p className="section-desc">{selectedRecord.company} 的采集结果如下。仅采集成功的账套可选择，下一步进入迁移配置。</p>
            </div>
            <span className={badgeClass(collectMeta.tone)}>{collectMeta.label}</span>
          </div>
          <div className="status-metrics">
            <button className="status-metric" onClick={() => openDetail(recordToDetail(selectedRecord))}>
              <span>导账记录</span>
              <strong>{selectedRecord.id.replace('ZG-202606', 'ZG-')}</strong>
              <small>{selectedRecord.source} → {selectedRecord.target}</small>
            </button>
            <button className="status-metric" onClick={() => openDetail({
              title: '采集成功账套',
              subtitle: `${successLedgers.length} 个账套可进入迁移配置。`,
              sections: [{ title: '账套数量', rows: successLedgers.map((item) => [item.ledgerName, item.period]) }]
            })}>
              <span>采集成功账套</span>
              <strong>{successLedgers.length}</strong>
              <small>可选择后进入迁移配置</small>
            </button>
            <button className="status-metric" onClick={() => openDetail({
              title: '采集异常账套',
              subtitle: `${abnormalLedgers.length} 个账套需要处理。`,
              sections: [{ title: '异常说明', rows: abnormalLedgers.map((item) => [item.ledgerName, item.risk ?? '需人工确认']) }]
            })}>
              <span>采集异常账套</span>
              <strong>{abnormalLedgers.length}</strong>
              <small>处理后可重新采集</small>
            </button>
          </div>
        </section>

        <section className="operation-card">
          <div className="section-title">
            <div>
              <h3>账套采集结果</h3>
              <p className="section-desc">切换查看采集成功和采集异常的账套数据。</p>
            </div>
            <span className={collectDetailTab === 'success' ? 'badge badge--ok' : 'badge badge--warn'}>
              {collectDetailTab === 'success' ? `${successLedgers.length} 个成功` : `${abnormalLedgers.length} 个异常`}
            </span>
          </div>
          <div className="status-tabs">
            <button className={`tab ${collectDetailTab === 'success' ? 'tab--active' : ''}`} onClick={() => setCollectDetailTab('success')}>采集成功（{successLedgers.length}）</button>
            <button className={`tab ${collectDetailTab === 'abnormal' ? 'tab--active' : ''}`} onClick={() => setCollectDetailTab('abnormal')}>采集异常（{abnormalLedgers.length}）</button>
          </div>
          {collectDetailTab === 'success' ? (
            <>
              <div className="table-action-row">
                <label className="check-line">
                  <input
                    type="checkbox"
                    checked={successLedgers.length > 0 && successLedgers.every((ledger) => selectedLedgers.includes(ledger.id))}
                    onChange={() => {
                      const successIds = successLedgers.map((ledger) => ledger.id);
                      const allSelected = successIds.every((id) => selectedLedgers.includes(id));
                      setSelectedLedgers(allSelected ? [] : successIds);
                    }}
                  />
                  全选采集成功账套
                </label>
                <span className="muted">已选 {selectedLedgers.length} / {successLedgers.length} 个</span>
              </div>
              <div className="record-table-wrap">
                <table className="record-table">
                  <thead>
                    <tr>
                      <th>选择</th>
                      <th>账套名称</th>
                      <th>企业名称</th>
                      <th>期间</th>
                      <th>凭证</th>
                      <th>发票</th>
                      <th>金额</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {successLedgers.map((ledger) => (
                      <tr key={ledger.id} onClick={() => openDetail(ledgerToDetail(ledger), 'on_ledger_detail_open')}>
                        <td onClick={(event) => event.stopPropagation()}>
                          <input type="checkbox" checked={selectedLedgers.includes(ledger.id)} onChange={() => toggleLedger(ledger.id)} aria-label={`选择 ${ledger.ledgerName}`} />
                        </td>
                        <td><strong>{ledger.ledgerName}</strong><span>{ledger.sourceSoftware}</span></td>
                        <td>{ledger.companyName}</td>
                        <td>{ledger.period}</td>
                        <td>{ledger.voucherCount}</td>
                        <td>{ledger.invoiceCount}</td>
                        <td>{ledger.amount}</td>
                        <td><button className="table-link" onClick={(event) => { event.stopPropagation(); openDetail(ledgerToDetail(ledger), 'on_ledger_detail_open'); }}>详情</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="record-table-wrap">
              <table className="record-table">
                <thead>
                  <tr>
                    <th>账套名称</th>
                    <th>企业名称</th>
                    <th>期间</th>
                    <th>异常原因</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {abnormalLedgers.map((ledger) => (
                    <tr key={ledger.id} onClick={() => openDetail(ledgerToDetail(ledger), 'on_ledger_detail_open')}>
                      <td><strong>{ledger.ledgerName}</strong><span>{ledger.sourceSoftware}</span></td>
                      <td>{ledger.companyName}</td>
                      <td>{ledger.period}</td>
                      <td>{ledger.risk ?? '需人工确认'}</td>
                      <td><button className="table-link" onClick={(event) => { event.stopPropagation(); openDetail(ledgerToDetail(ledger), 'on_ledger_detail_open'); }}>详情</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="button-row">
          <button className="btn" onClick={() => setActiveTab('records')}>返回工作台</button>
          <button className="btn btn-primary" disabled={selectedLedgers.length === 0} onClick={() => { appendLog(`进入迁移配置 ${selectedRecord.id}`); setActiveTab('config'); }}><ArrowRight size={16} />进入迁移配置</button>
        </div>
      </div>
    );
  };

  const renderLedgerDetail = () => (
    <section className="operation-card">
      <div className="section-title">
        <h3>账套确认</h3>
        <span className="badge badge--warn">{ledgers.filter((item) => !item.migratable).length} 个需要处理</span>
      </div>
      <div className="ledger-list">
        {ledgers.map((ledger) => (
          <article className={`ledger-card ${ledger.migratable ? '' : 'ledger-card--blocked'}`} key={ledger.id}>
            <input className="ledger-check" type="checkbox" checked={selectedLedgers.includes(ledger.id)} onChange={() => toggleLedger(ledger.id)} />
            <button className="ledger-main" onClick={() => openDetail(ledgerToDetail(ledger), 'on_ledger_detail_open')}>
              <div className="ledger-title">
                <strong>{ledger.ledgerName}</strong>
                <span className={ledger.migratable ? 'badge badge--ok' : 'badge badge--warn'}>{ledger.migratable ? '可迁移' : '需处理'}</span>
              </div>
              <div className="ledger-meta">
                <span>{ledger.companyName}</span>
                <span>信用代码：{ledger.creditCode || '待补充'}</span>
                <span>{ledger.taxType}</span>
                <span>{ledger.accountingStandard}</span>
              </div>
              {ledger.risk ? <p className="risk-copy">{ledger.risk}</p> : null}
            </button>
            <button className="btn btn-ghost" onClick={() => openDetail(ledgerToDetail(ledger), 'on_ledger_detail_open')}><Eye size={15} />详情</button>
          </article>
        ))}
      </div>
      <div className="button-row">
        <button className="btn btn-primary" onClick={() => goPage('config')}><ArrowRight size={16} />进入迁移设置</button>
      </div>
    </section>
  );

  const renderConfig = () => (
    <div className="config-section">
      <section className="operation-card">
        <div className="section-title">
          <div>
            <h3>迁移配置</h3>
            <p className="section-desc">请确认匹配方式、迁移方式、迁移内容和目标财务软件，提交后回到工作台等待迁移结果。</p>
          </div>
          <span className="badge">{selectedLedgers.length} 个账套</span>
        </div>
      </section>
      <section className="operation-card">
        <div className="section-title">
          <h3>匹配方式</h3>
          <button className="btn" onClick={() => openDetail({
            title: '匹配方式说明',
            subtitle: '匹配方式决定源账套和目标企业如何对应。',
            sections: [{ title: '推荐选择', rows: [['账套名称 + 信用代码', '适合绝大多数企业迁移'], ['按信用代码', '适合账套名称不统一时使用'], ['按账套名称', '适合企业主体信息不完整时临时处理']] }]
          })}><Eye size={15} />查看说明</button>
        </div>
        <div className="option-grid">
          {[
            ['name', '按账套名称', '按源账套名称匹配目标账套'],
            ['code', '按统一社会信用代码', '按企业主体信息匹配'],
            ['both', '账套名称 + 信用代码', '推荐，准确性最高']
          ].map(([key, label, desc]) => (
            <button className={`option-card ${matchMode === key ? 'option-card--active' : ''}`} key={key} onClick={() => { setMatchMode(key as MatchMode); emit('on_config_change', { matchMode: key, migrationMode, selectedContents }); }}>
              <strong>{label}</strong><span>{desc}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="operation-card">
        <div className="section-title"><h3>迁移方式</h3></div>
        <div className="option-grid">
          <button className={`option-card ${migrationMode === 'skip' ? 'option-card--active' : ''}`} onClick={() => { setMigrationMode('skip'); emit('on_config_change', { matchMode, migrationMode: 'skip', selectedContents }); }}>
            <strong>跳过已创建账套的企业</strong><span>默认推荐，避免影响目标系统已有数据</span>
          </button>
          <button className={`option-card ${migrationMode === 'cover' ? 'option-card--active' : ''}`} onClick={() => { setMigrationMode('cover'); emit('on_config_change', { matchMode, migrationMode: 'cover', selectedContents }); }}>
            <strong>覆盖已创建账套的企业</strong><span>用本次采集数据更新目标账套</span>
          </button>
        </div>
        {migrationMode === 'cover' ? (
          <div className="risk-box">
            <AlertTriangle size={18} color="#d97706" />
            <div><strong>覆盖前请确认影响范围</strong><p className="risk-copy">目标系统已有数据可能被更新，建议先打开详情核对企业和期间。</p></div>
          </div>
        ) : null}
      </section>
      <section className="operation-card">
        <div className="section-title"><h3>迁移内容</h3><span className="badge">{selectedContents.length} 项已选</span></div>
        <div className="content-groups">
          {contentGroups.map((group) => (
            <div className="content-group" key={group.title}>
              <button className="content-title" onClick={() => openDetail({
                title: group.title,
                subtitle: '查看本组数据项和迁移说明。',
                sections: [{ title: '数据项', rows: group.items.map((item) => [item, selectedContents.includes(item) ? '已选择' : '未选择']) }],
                actions: ['全选本组', '查看字段映射']
              })}>{group.title}<Eye size={14} /></button>
              <div className="content-list">
                {group.items.map((item) => (
                  <label className="check-line" key={item}>
                    <input type="checkbox" checked={selectedContents.includes(item)} onChange={() => toggleContent(item)} />
                    {item}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="operation-card">
        <div className="section-title"><h3>目标财务软件</h3></div>
        <div className="field-grid">
          <div className="field">
            <label>目标软件</label>
            <select value={targetSoftware} onChange={(event) => setTargetSoftware(event.target.value)}>
              <option>猪哥云</option>
              <option>财税合规 AI 服务系统</option>
              <option>亿企赢</option>
            </select>
          </div>
          <div className="field">
            <label>目标服务商名称</label>
            <input defaultValue="合云迁移目标服务商" />
          </div>
          <div className="field">
            <label>目标系统账号</label>
            <input defaultValue="target_admin" />
          </div>
          <div className="field">
            <label>目标系统密码</label>
            <input type="password" placeholder="请输入目标系统密码" />
          </div>
        </div>
        <div className="button-row">
          <button className="btn" onClick={() => setActiveTab('collectDetail')}>返回采集详情</button>
          <button className="btn btn-primary" onClick={submitMigration}><Rocket size={16} />提交迁移</button>
        </div>
      </section>
    </div>
  );

  const renderMigrationDetail = () => {
    const view = migrationStatusViews[migrationStatus as MigrationStatus] ?? migrationStatusViews.pending;
    const progress = view.progress;
    const successMigrationLedgers = migrationStatus === 'migrate_success'
      ? migratedLedgerRows
      : migrationStatus === 'migrate_partial'
        ? migratedLedgerRows.slice(0, 1)
        : [];
    const abnormalMigrationItems = (migrationStatus === 'migrate_partial' || migrationStatus === 'migrate_failed')
      ? [
        { name: '深圳云帆供应链账套', desc: '统一社会信用代码缺失，无法匹配目标企业', advice: '补充企业识别信息' },
        { name: '凭证附件', desc: '附件体积较大，需要分批迁移', advice: '分批提交附件' }
      ]
      : [];
    return (
      <div className="config-section">
        <section className="progress-box">
          <div className="progress-head">
            <div>
              <strong>迁移详情 {selectedRecord.id}</strong>
              <p className="muted">目标软件：{targetSoftware} · 账套：{selectedLedgers.length} 个 · 数据范围：{selectedContents.length} 项</p>
              <p className="section-desc">{view.summary}</p>
            </div>
            <span className={badgeClass(migrationMeta.tone)}>{migrationMeta.label}</span>
          </div>
          <div className="status-metrics">
            {view.metrics.map(([label, value, desc]) => (
              <button className="status-metric" key={label} onClick={() => openDetail({
                title: label,
                subtitle: desc,
                sections: [{ title: '迁移状态', rows: [['当前状态', migrationMeta.label], ['指标值', value], ['说明', desc], ['目标软件', targetSoftware]] }]
              })}>
                <span>{label}</span>
                <strong>{value}</strong>
                <small>{desc}</small>
              </button>
            ))}
          </div>
          <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
          <div className="progress-steps">
            {view.stages.map((stage, index) => (
              <button className={progress >= (index + 1) * 24 ? 'done' : ''} key={stage.title} onClick={() => openDetail({
                title: stage.title,
                subtitle: stage.desc,
                sections: [{ title: '阶段信息', rows: [['处理结果', stage.result], ['负责人', stage.owner], ['更新时间', stage.updatedAt], ['目标软件', targetSoftware], ['账套数量', `${selectedLedgers.length} 个`], ['数据范围', `${selectedContents.length} 项`]] }]
              })}>{stage.title}</button>
            ))}
          </div>
        </section>
        <section className="operation-card">
          <div className="section-title">
            <div>
              <h3>账套迁移情况</h3>
              <p className="section-desc">切换查看迁移成功和迁移异常的账套数据。</p>
            </div>
            <span className={migrationDetailTab === 'success' ? 'badge badge--ok' : 'badge badge--warn'}>
              {migrationDetailTab === 'success' ? `${successMigrationLedgers.length} 个成功` : `${abnormalMigrationItems.length} 个异常`}
            </span>
          </div>
          <div className="status-tabs">
            <button className={`tab ${migrationDetailTab === 'success' ? 'tab--active' : ''}`} onClick={() => setMigrationDetailTab('success')}>迁移成功（{successMigrationLedgers.length}）</button>
            <button className={`tab ${migrationDetailTab === 'abnormal' ? 'tab--active' : ''}`} onClick={() => setMigrationDetailTab('abnormal')}>迁移异常（{abnormalMigrationItems.length}）</button>
          </div>
          {migrationDetailTab === 'success' ? (
            successMigrationLedgers.length > 0 ? (
              <div className="record-table-wrap">
                <table className="record-table">
                  <thead>
                    <tr>
                      <th>源账套</th>
                      <th>目标账套</th>
                      <th>目标编号</th>
                      <th>期间</th>
                      <th>凭证</th>
                      <th>发票</th>
                      <th>附件</th>
                      <th>金额</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {successMigrationLedgers.map((ledger) => (
                      <tr key={ledger.id} onClick={() => openDetail({
                        title: ledger.targetLedger,
                        subtitle: `${ledger.sourceLedger} 已迁移至目标系统。`,
                        sections: [
                          { title: '目标账套', rows: [['企业名称', ledger.company], ['目标账套编号', ledger.targetCode], ['目标账套名称', ledger.targetLedger], ['所属期间', ledger.period], ['完成时间', ledger.completedAt]] },
                          { title: '写入数据', rows: [['凭证数量', `${ledger.voucherCount} 条`], ['发票数量', `${ledger.invoiceCount} 张`], ['附件数量', `${ledger.attachmentCount} 个`], ['金额合计', ledger.amount]] }
                        ],
                        actions: ['导出明细', '查看目标系统']
                      })}>
                        <td><strong>{ledger.sourceLedger}</strong><span>{ledger.company}</span></td>
                        <td>{ledger.targetLedger}</td>
                        <td>{ledger.targetCode}</td>
                        <td>{ledger.period}</td>
                        <td>{ledger.voucherCount}</td>
                        <td>{ledger.invoiceCount}</td>
                        <td>{ledger.attachmentCount}</td>
                        <td>{ledger.amount}</td>
                        <td><button className="table-link" onClick={(event) => { event.stopPropagation(); openDetail({
                          title: ledger.targetLedger,
                          subtitle: `${ledger.sourceLedger} 已迁移至目标系统。`,
                          sections: [
                            { title: '目标账套', rows: [['企业名称', ledger.company], ['目标账套编号', ledger.targetCode], ['目标账套名称', ledger.targetLedger], ['所属期间', ledger.period], ['完成时间', ledger.completedAt]] },
                            { title: '写入数据', rows: [['凭证数量', `${ledger.voucherCount} 条`], ['发票数量', `${ledger.invoiceCount} 张`], ['附件数量', `${ledger.attachmentCount} 个`], ['金额合计', ledger.amount]] }
                          ],
                          actions: ['导出明细', '查看目标系统']
                        }); }}>详情</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="empty-box">暂无迁移成功账套。</div>
          ) : (
            abnormalMigrationItems.length > 0 ? (
              <div className="record-table-wrap">
                <table className="record-table">
                  <thead>
                    <tr>
                      <th>异常对象</th>
                      <th>异常原因</th>
                      <th>处理建议</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {abnormalMigrationItems.map((item) => (
                      <tr key={item.name} onClick={() => openDetail({
                        title: item.name,
                        subtitle: item.desc,
                        sections: [{ title: '迁移异常', rows: [['问题', item.desc], ['建议', item.advice], ['影响范围', selectedLedgers.join('、') || '未选择账套']] }],
                        actions: ['导出清单']
                      })}>
                        <td><strong>{item.name}</strong></td>
                        <td>{item.desc}</td>
                        <td>{item.advice}</td>
                        <td><button className="table-link" onClick={(event) => { event.stopPropagation(); openDetail({
                          title: item.name,
                          subtitle: item.desc,
                          sections: [{ title: '迁移异常', rows: [['问题', item.desc], ['建议', item.advice], ['影响范围', selectedLedgers.join('、') || '未选择账套']] }],
                          actions: ['导出清单']
                        }); }}>详情</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="empty-box">暂无迁移异常。</div>
          )}
        </section>
        <div className="button-row"><button className="btn" onClick={() => setActiveTab('records')}>返回工作台</button></div>
      </div>
    );
  };

  const renderPage = () => {
    if (activeTab === 'records') return renderDashboard();
    if (activeTab === 'collectDetail') return renderCollectDetail();
    if (activeTab === 'config') return renderConfig();
    return renderMigrationDetail();
  };

  if (!loggedIn) return renderLogin();

  return (
    <main className="ledger-flow-app">
      <header className="ledger-topbar">
        <div className="ledger-brand">
          <div className="ledger-brand-mark"><Building2 size={22} /></div>
          <div>
            <h1>{title}</h1>
            <p>企业自助导账服务平台</p>
          </div>
        </div>
        <div className="top-stats">
          <button className="user-chip" onClick={() => openDetail({
            title: '账户偏好',
            subtitle: '查看当前用户、通知和默认迁移偏好。',
            sections: [{ title: '账号信息', rows: [['姓名', '曹议'], ['角色', '服务商运营'], ['默认匹配方式', '账套名称 + 信用代码'], ['通知偏好', '站内通知、邮件']] }],
            actions: ['保存偏好']
          })}>
            <UserCircle size={18} />
            曹议
          </button>
          <button className="btn" onClick={logout}><LogOut size={15} />退出</button>
        </div>
      </header>

      <div className="ledger-shell">
        <section className="step-panel">
          <div className="step-header">
            <div>
              <div className="breadcrumb">
                {breadcrumbItems.map((item, index) => {
                  const isLast = index === breadcrumbItems.length - 1;
                  return (
                    <React.Fragment key={`${item}-${index}`}>
                      {index > 0 ? <span className="breadcrumb-separator">/</span> : null}
                      {isLast ? (
                        <span>{item}</span>
                      ) : (
                        <button onClick={() => setActiveTab('records')}>{item}</button>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
              <h2>{currentTabInfo.title}</h2>
              <p className="panel-lead">{currentTabInfo.desc}</p>
            </div>
            <div className="badge-row">
              <span className={badgeClass(collectMeta.tone)}>采集：{collectMeta.label}</span>
              <span className={badgeClass(migrationMeta.tone)}>迁移：{migrationMeta.label}</span>
            </div>
          </div>
          {renderPage()}
        </section>

        <aside className="side-panel">
          <div className="side-card">
            <h3>操作记录</h3>
            <div className="log-list">
              {logs.map((item, index) => (
                <button className="log-item" key={`${item.content}-${item.time}-${index}`} onClick={() => openDetail({
                  title: '操作记录',
                  subtitle: item.content,
                  sections: [{ title: '记录信息', rows: [['操作内容', item.content], ['操作时间', item.time], ['操作人', loginAccount]] }]
                })}>
                  <span className="log-time">{item.time}</span>
                  <span className="log-copy">{item.content}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {detail ? (
        <div className="detail-drawer" role="dialog" aria-label="详情">
          <div className="detail-backdrop" onClick={() => setDetail(null)} />
          <section className="detail-panel">
            <div className="detail-head">
              <div>
                <span className="login-kicker">详情</span>
                <h2>{detail.title}</h2>
                <p>{detail.subtitle}</p>
              </div>
              <button className="icon-btn" onClick={() => setDetail(null)} aria-label="关闭详情"><X size={18} /></button>
            </div>
            <div className="detail-body">
              {detail.sections.map((section) => (
                <div className="detail-section" key={section.title}>
                  <h3>{section.title}</h3>
                  {section.rows.map(([key, value]) => (
                    <div className="detail-row" key={key}>
                      <span>{key}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {detail.actions?.length ? (
              <div className="detail-actions">
                {detail.actions.map((action, index) => (
                  <button className={index === 0 ? 'btn btn-primary' : 'btn'} key={action}>{action}</button>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {collectDrawerOpen ? (
        <div className="detail-drawer" role="dialog" aria-label="新建采集">
          <div className="detail-backdrop" onClick={() => setCollectDrawerOpen(false)} />
          <section className="detail-panel">
            <div className="detail-head">
              <div>
                <span className="login-kicker">新建采集</span>
                <h2>连接源财务软件</h2>
                <p>填写源软件和商户信息后，系统将在当前工作台生成采集记录。</p>
              </div>
              <button className="icon-btn" onClick={() => setCollectDrawerOpen(false)} aria-label="关闭新建采集"><X size={18} /></button>
            </div>
            <div className="detail-body">
              <div className="detail-form">
                <div className="field">
                  <label>源财务软件</label>
                  <select value={sourceSoftware} onChange={(event) => setSourceSoftware(event.target.value)}>
                    <option>猪哥云</option>
                    <option>财税合规 AI 服务系统</option>
                    <option>亿企赢</option>
                  </select>
                </div>
                <div className="field">
                  <label>商户/服务商名称</label>
                  <input value={merchant} onChange={(event) => setMerchant(event.target.value)} />
                </div>
                <div className="field">
                  <label>源系统账号</label>
                  <input value={sourceAccount} onChange={(event) => setSourceAccount(event.target.value)} />
                </div>
                <div className="field">
                  <label>源系统密码</label>
                  <input type="password" placeholder="请输入源系统密码" />
                </div>
              </div>
            </div>
            <div className="detail-actions">
              <button className="btn" onClick={() => setCollectDrawerOpen(false)}>取消</button>
              <button className="btn btn-primary" onClick={submitCollect}><ArrowRight size={16} />提交采集</button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
});

export default Component;
