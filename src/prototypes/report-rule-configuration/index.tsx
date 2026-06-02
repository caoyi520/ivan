/**
 * @name 报表及规则配置页面
 * @mode axure
 *
 * 参考资料：
 * - /rules/design-guide.md
 * - /rules/development-guide.md
 * - /src/themes/antd-new/DESIGN.md
 * - /skills/third-party/interface-design/SKILL.md
 */

import './style.css';
import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  ConfigProvider,
  Divider,
  Empty,
  Form,
  Input,
  Modal,
  Progress,
  Row,
  Col,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message
} from 'antd';
import {
  ArrowLeftOutlined,
  AuditOutlined,
  BankOutlined,
  CheckCircleOutlined,
  CloudDownloadOutlined,
  ControlOutlined,
  DeleteOutlined,
  FileDoneOutlined,
  FileProtectOutlined,
  PlusOutlined,
  FundProjectionScreenOutlined,
  PartitionOutlined,
  SaveOutlined,
  SlidersOutlined,
  SwapOutlined,
  WarningOutlined
} from '@ant-design/icons';

import type {
  Action,
  AxureHandle,
  AxureProps,
  ConfigItem,
  DataDesc,
  EventItem,
  KeyDesc
} from '../../common/axure-types';

const { Text } = Typography;

type ReportStatus = 'ready' | 'draft' | 'risk';
type RuleSeverity = 'info' | 'warning' | 'blocker';

type ReportConfig = {
  id: string;
  name: string;
  code: string;
  period: string;
  owner: string;
  status: ReportStatus;
  enabled: boolean;
  linkedRules: number;
  requiredFields: string[];
  basis: string;
  deadline: string;
};

type RuleItem = {
  id: string;
  name: string;
  condition: string;
  action: string;
  severity: RuleSeverity;
  enabled: boolean;
  priority: number;
};

type RuleGroup = {
  id: string;
  name: string;
  description: string;
  scope: string;
  rules: RuleItem[];
};

type AccountingStandard = {
  id: string;
  name: string;
  shortName: string;
  version: string;
  description: string;
  lastPublished: string;
  pendingChanges: number;
  entities: number;
  reports: ReportConfig[];
  ruleGroups: RuleGroup[];
};

type ReportPreview =
  | {
    layout: 'paired';
    title: string;
    unit: string;
    leftTitle: string;
    rightTitle: string;
    leftRows: string[][];
    rightRows: string[][];
  }
  | {
    layout: 'single';
    title: string;
    unit: string;
    columns: string[];
    rows: { type?: 'section' | 'total'; cells: string[] }[];
  };

type PageMode = 'overview' | 'detail';
type EditableRowSide = 'asset' | 'liability';
type SubjectRuleLine = {
  id: string;
  subject: string;
  operator: '+' | '-';
  valueRule: string;
};

type EditableReportRow = {
  id: string;
  side: EditableRowSide;
  item: string;
  lineNo: string;
  accountSubjects?: string;
  subjectRules?: SubjectRuleLine[];
  valueRange: string;
  ruleType: string;
  ruleExpression: string;
  source: string;
  enabled: boolean;
  rowType?: 'section' | 'total';
};

const SUBJECT_OPTIONS = [
  '请选择科目',
  '1001 库存现金',
  '1002 银行存款',
  '1012 其他货币资金',
  '1101 短期投资',
  '1122 应收账款',
  '1401 材料采购',
  '1403 原材料',
  '1405 库存商品',
  '1601 固定资产',
  '1602 累计折旧',
  '2202 应付账款',
  '2203 预收账款',
  '3001 实收资本',
  '3104 利润分配',
  '3131 本年利润',
  '6001 主营业务收入',
  '6051 其他业务收入',
  '6301 营业外收入',
  '6401 主营业务成本',
  '6402 其他业务成本',
  '6403 税金及附加',
  '6601 销售费用',
  '6602 管理费用',
  '6711 营业外支出',
  '6801 所得税费用'
].map((subject) => ({ label: subject, value: subject }));

const VALUE_RANGE_OPTIONS = [
  { label: '余额', value: '余额' },
  { label: '借方余额', value: '借方余额' },
  { label: '贷方余额', value: '贷方余额' },
  { label: '发生额', value: '发生额' },
  { label: '借方发生额', value: '借方发生额' },
  { label: '贷方发生额', value: '贷方发生额' },
  { label: '表内公式', value: '表内公式' }
];

const EVENT_LIST: EventItem[] = [
  { name: 'onStandardChange', desc: '切换会计准则时触发', payload: '当前准则 JSON 字符串' },
  { name: 'onReportToggle', desc: '启停报表时触发', payload: '报表与准则 JSON 字符串' },
  { name: 'onReportSelect', desc: '选择报表配置时触发', payload: '当前报表 JSON 字符串' },
  { name: 'onRuleToggle', desc: '启停规则时触发', payload: '规则与准则 JSON 字符串' },
  { name: 'onSaveDraft', desc: '保存草稿时触发', payload: '当前配置状态 JSON 字符串' },
  { name: 'onPublishConfiguration', desc: '发布配置时触发', payload: '当前准则配置 JSON 字符串' },
  { name: 'onExportRulePack', desc: '导出规则包时触发', payload: '当前准则配置 JSON 字符串' },
  { name: 'onOpenReportDetail', desc: '进入报表配置详情时触发', payload: '当前报表 JSON 字符串' },
  { name: 'onReportRowChange', desc: '编辑报表行项目或取值规则时触发', payload: '当前行 JSON 字符串' }
];

const ACTION_LIST: Action[] = [
  { name: 'switch_standard', desc: '切换当前会计准则', params: '会计准则 id' },
  { name: 'toggle_report', desc: '启停当前准则下的指定报表', params: '报表 id' },
  { name: 'toggle_rule', desc: '启停当前准则下的指定规则', params: '规则 id' },
  { name: 'publish_configuration', desc: '发布当前准则配置' }
];

const VAR_LIST: KeyDesc[] = [
  { name: 'current_standard', desc: '当前选中的会计准则' },
  { name: 'current_report', desc: '当前选中的报表' },
  { name: 'enabled_report_count', desc: '当前准则启用报表数量' },
  { name: 'enabled_rule_count', desc: '当前准则启用规则数量' },
  { name: 'pending_changes', desc: '当前准则待发布变更数量' }
];

const CONFIG_LIST: ConfigItem[] = [
  { type: 'input', attributeId: 'title', displayName: '页面标题', initialValue: '报表规则模板配置' },
  {
    type: 'input',
    attributeId: 'subtitle',
    displayName: '页面说明',
    initialValue: '后台统一维护新建客户账套的初始报表规则'
  },
  { type: 'input', attributeId: 'tenantName', displayName: '企业主体', initialValue: '默认模板库' }
];

const DATA_LIST: DataDesc[] = [
  {
    name: 'standards',
    desc: '会计准则配置列表',
    keys: [
      { name: 'id', desc: '会计准则唯一标识' },
      { name: 'name', desc: '会计准则名称' },
      { name: 'version', desc: '准则版本' },
      { name: 'reports', desc: '报表配置列表' },
      { name: 'ruleGroups', desc: '规则分组列表' },
      { name: 'pendingChanges', desc: '待发布变更数量' }
    ]
  }
];

const DEFAULT_STANDARDS: AccountingStandard[] = [
  {
    id: 'cas',
    name: '企业会计准则',
    shortName: 'CAS',
    version: '2024 修订版',
    description: '适用于一般纳税人及集团合并报表主体，强调税会差异、合并抵销和附注披露。',
    lastPublished: '2026-05-21 16:40',
    pendingChanges: 7,
    entities: 18,
    reports: [
      {
        id: 'bs',
        name: '资产负债表',
        code: 'CAS-FS-01',
        period: '月报 / 年报',
        owner: '财务报表组',
        status: 'ready',
        enabled: true,
        linkedRules: 12,
        requiredFields: ['资产类科目余额', '负债类科目余额', '所有者权益科目余额'],
        basis: '按流动性列示，递延所得税资产负债单独披露。',
        deadline: '次月第 5 个工作日'
      },
      {
        id: 'pl',
        name: '利润表',
        code: 'CAS-FS-02',
        period: '月报 / 季报 / 年报',
        owner: '经营分析组',
        status: 'draft',
        enabled: true,
        linkedRules: 9,
        requiredFields: ['营业收入', '营业成本', '期间费用', '所得税费用'],
        basis: '按功能法列示，公允价值变动损益单独映射。',
        deadline: '次月第 5 个工作日'
      },
      {
        id: 'cf',
        name: '现金流量表',
        code: 'CAS-FS-03',
        period: '月报 / 年报',
        owner: '资金管理组',
        status: 'risk',
        enabled: true,
        linkedRules: 14,
        requiredFields: ['现金科目发生额', '辅助核算项目', '主表项目归集'],
        basis: '经营、投资、筹资活动三段式归集，并校验补充资料。',
        deadline: '次月第 7 个工作日'
      },
      {
        id: 'equity',
        name: '所有者权益变动表',
        code: 'CAS-FS-04',
        period: '年报',
        owner: '合并报表组',
        status: 'ready',
        enabled: true,
        linkedRules: 7,
        requiredFields: ['实收资本', '资本公积', '盈余公积', '未分配利润'],
        basis: '按权益项目分列本年增减变动。',
        deadline: '年度结账后 10 个工作日'
      },
      {
        id: 'tax-adjust',
        name: '纳税调整明细表',
        code: 'TAX-A105000',
        period: '年报',
        owner: '税务合规组',
        status: 'draft',
        enabled: false,
        linkedRules: 6,
        requiredFields: ['会计利润', '纳税调整增加额', '纳税调整减少额'],
        basis: '按企业所得税汇算清缴口径生成税会差异调整。',
        deadline: '汇算清缴截止日前'
      }
    ],
    ruleGroups: [
      {
        id: 'mapping',
        name: '科目映射',
        description: '将总账科目、辅助核算与报表项目建立映射。',
        scope: '报表取数',
        rules: [
          {
            id: 'r-map-cash',
            name: '现金及等价物归集',
            condition: '科目编码以 1001、1002、1012 开头',
            action: '映射至货币资金与现金流量表现金项目',
            severity: 'info',
            enabled: true,
            priority: 20
          },
          {
            id: 'r-map-contract',
            name: '合同资产重分类',
            condition: '合同履约进度已确认且未达到收款权',
            action: '列示为合同资产，排除应收账款项目',
            severity: 'warning',
            enabled: true,
            priority: 40
          }
        ]
      },
      {
        id: 'validation',
        name: '报表校验',
        description: '检查报表勾稽、借贷平衡和跨表一致性。',
        scope: '提交前校验',
        rules: [
          {
            id: 'r-balancing',
            name: '资产等于负债加权益',
            condition: '资产总计 - 负债合计 - 所有者权益合计 ≠ 0',
            action: '阻断发布并定位差异科目',
            severity: 'blocker',
            enabled: true,
            priority: 10
          },
          {
            id: 'r-cashflow-bridge',
            name: '现金流补充资料一致',
            condition: '主表现金净增加额与补充资料差异超过 1 元',
            action: '标记为高风险并要求复核',
            severity: 'warning',
            enabled: false,
            priority: 30
          }
        ]
      },
      {
        id: 'disclosure',
        name: '披露规则',
        description: '控制附注披露字段、阈值和必填项。',
        scope: '年报附注',
        rules: [
          {
            id: 'r-disclose-tax',
            name: '递延所得税披露',
            condition: '递延所得税资产或负债余额不为 0',
            action: '附注中展示可抵扣暂时性差异明细',
            severity: 'info',
            enabled: true,
            priority: 60
          }
        ]
      }
    ]
  },
  {
    id: 'small',
    name: '小企业会计准则',
    shortName: '小企',
    version: '2025 适用版',
    description: '适用于规模较小、核算简化的企业主体，减少附注和复杂重分类。',
    lastPublished: '2026-05-18 10:12',
    pendingChanges: 3,
    entities: 9,
    reports: [
      {
        id: 'small-bs',
        name: '资产负债表',
        code: 'SBE-FS-01',
        period: '月报 / 年报',
        owner: '代理记账组',
        status: 'ready',
        enabled: true,
        linkedRules: 8,
        requiredFields: ['资产类余额', '负债类余额', '所有者权益余额'],
        basis: '按小企业会计准则简化科目列示。',
        deadline: '次月第 6 个工作日'
      },
      {
        id: 'small-pl',
        name: '利润表',
        code: 'SBE-FS-02',
        period: '季报 / 年报',
        owner: '代理记账组',
        status: 'ready',
        enabled: true,
        linkedRules: 6,
        requiredFields: ['主营业务收入', '主营业务成本', '利润总额'],
        basis: '按小企业常用损益项目列示。',
        deadline: '季度终了后 10 日内'
      },
      {
        id: 'small-tax',
        name: '增值税申报附表',
        code: 'VAT-SM-01',
        period: '月报 / 季报',
        owner: '税务申报组',
        status: 'risk',
        enabled: true,
        linkedRules: 5,
        requiredFields: ['销售额', '征收率', '减免税额'],
        basis: '按小规模纳税人征收率与减免政策生成。',
        deadline: '申报期截止前 2 日'
      }
    ],
    ruleGroups: [
      {
        id: 'small-mapping',
        name: '简化映射',
        description: '将小企业常用科目映射至简化报表项目。',
        scope: '报表取数',
        rules: [
          {
            id: 'small-r-income',
            name: '主营业务收入归集',
            condition: '收入类科目发生额为贷方',
            action: '映射至营业收入',
            severity: 'info',
            enabled: true,
            priority: 20
          }
        ]
      },
      {
        id: 'small-validation',
        name: '税额校验',
        description: '校验征收率、免税销售额和申报口径。',
        scope: '纳税申报',
        rules: [
          {
            id: 'small-r-vat-rate',
            name: '征收率匹配',
            condition: '销项税额与销售额乘征收率差异超过 0.5 元',
            action: '提示税率口径复核',
            severity: 'warning',
            enabled: true,
            priority: 30
          },
          {
            id: 'small-r-relief',
            name: '小微减免额度检查',
            condition: '季度销售额低于政策阈值',
            action: '自动带出减免税额',
            severity: 'info',
            enabled: false,
            priority: 45
          }
        ]
      }
    ]
  },
  {
    id: 'ifrs',
    name: '国际财务报告准则',
    shortName: 'IFRS',
    version: 'IFRS 2026',
    description: '适用于出海主体、境外融资和集团国际合并报告。',
    lastPublished: '2026-05-09 18:05',
    pendingChanges: 11,
    entities: 5,
    reports: [
      {
        id: 'ifrs-position',
        name: 'Statement of Financial Position',
        code: 'IFRS-SFP',
        period: 'Quarter / Year',
        owner: '国际报表组',
        status: 'draft',
        enabled: true,
        linkedRules: 13,
        requiredFields: ['Assets', 'Liabilities', 'Equity'],
        basis: '按 IFRS 流动/非流动分类与披露口径列示。',
        deadline: '月结后 8 个工作日'
      },
      {
        id: 'ifrs-income',
        name: 'Statement of Profit or Loss',
        code: 'IFRS-SPL',
        period: 'Quarter / Year',
        owner: '国际报表组',
        status: 'ready',
        enabled: true,
        linkedRules: 10,
        requiredFields: ['Revenue', 'Cost of sales', 'Tax expense'],
        basis: '支持功能法与性质法利润表结构。',
        deadline: '月结后 8 个工作日'
      },
      {
        id: 'ifrs-lease',
        name: '租赁负债附注',
        code: 'IFRS-16-NOTE',
        period: 'Year',
        owner: '披露管理组',
        status: 'risk',
        enabled: false,
        linkedRules: 4,
        requiredFields: ['租赁资产', '租赁负债', '折现率'],
        basis: '按 IFRS 16 生成租赁变动披露。',
        deadline: '年报审计前'
      }
    ],
    ruleGroups: [
      {
        id: 'ifrs-reclass',
        name: 'IFRS 重分类',
        description: '处理 CAS 到 IFRS 的差异重分类。',
        scope: '准则转换',
        rules: [
          {
            id: 'ifrs-r-lease',
            name: '租赁准则转换',
            condition: '合同类型为长期租赁且非短期豁免',
            action: '确认使用权资产与租赁负债',
            severity: 'warning',
            enabled: true,
            priority: 20
          },
          {
            id: 'ifrs-r-revenue',
            name: '收入五步法复核',
            condition: '存在多履约义务合同',
            action: '拆分交易价格并生成履约进度披露',
            severity: 'blocker',
            enabled: true,
            priority: 15
          }
        ]
      },
      {
        id: 'ifrs-disclosure',
        name: '英文披露',
        description: '控制国际报表附注披露字段。',
        scope: '附注披露',
        rules: [
          {
            id: 'ifrs-r-note',
            name: '重大判断与估计披露',
            condition: '估计不确定性金额超过资产总额 5%',
            action: '生成 Critical accounting estimates 披露段落',
            severity: 'info',
            enabled: true,
            priority: 55
          }
        ]
      }
    ]
  },
  {
    id: 'ngo',
    name: '民间非营利组织会计制度',
    shortName: '非营利',
    version: '2024 实施口径',
    description: '适用于基金会、协会等非营利主体，关注限定性净资产与项目资金披露。',
    lastPublished: '2026-05-12 14:26',
    pendingChanges: 2,
    entities: 4,
    reports: [
      {
        id: 'ngo-bs',
        name: '资产负债表',
        code: 'NGO-FS-01',
        period: '月报 / 年报',
        owner: '公益项目财务',
        status: 'ready',
        enabled: true,
        linkedRules: 6,
        requiredFields: ['资产', '负债', '净资产'],
        basis: '按限定性与非限定性净资产拆分。',
        deadline: '次月第 8 个工作日'
      },
      {
        id: 'ngo-activity',
        name: '业务活动表',
        code: 'NGO-FS-02',
        period: '月报 / 年报',
        owner: '公益项目财务',
        status: 'draft',
        enabled: true,
        linkedRules: 8,
        requiredFields: ['捐赠收入', '项目支出', '管理费用'],
        basis: '按限定性、非限定性收入费用列示。',
        deadline: '次月第 8 个工作日'
      },
      {
        id: 'ngo-project',
        name: '项目资金收支明细',
        code: 'NGO-PROJ-01',
        period: '项目周期',
        owner: '项目管理组',
        status: 'ready',
        enabled: true,
        linkedRules: 5,
        requiredFields: ['项目编号', '资金来源', '支出用途'],
        basis: '按项目维度穿透披露资金流向。',
        deadline: '项目结项前'
      }
    ],
    ruleGroups: [
      {
        id: 'ngo-net-assets',
        name: '净资产限定规则',
        description: '按捐赠协议和项目用途识别限定性净资产。',
        scope: '项目核算',
        rules: [
          {
            id: 'ngo-r-restricted',
            name: '限定性资金识别',
            condition: '资金来源存在用途限制或时间限制',
            action: '归集至限定性净资产',
            severity: 'warning',
            enabled: true,
            priority: 25
          },
          {
            id: 'ngo-r-release',
            name: '限定解除确认',
            condition: '项目支出已满足捐赠协议用途',
            action: '从限定性净资产转入非限定性净资产',
            severity: 'info',
            enabled: true,
            priority: 42
          }
        ]
      }
    ]
  }
];

function safePayload(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function statusMeta(status: ReportStatus) {
  if (status === 'ready') return { color: 'success', label: '已就绪' };
  if (status === 'risk') return { color: 'warning', label: '有风险' };
  return { color: 'processing', label: '草稿' };
}

function severityMeta(severity: RuleSeverity) {
  if (severity === 'blocker') return { color: 'red', label: '阻断' };
  if (severity === 'warning') return { color: 'gold', label: '提醒' };
  return { color: 'blue', label: '提示' };
}

function getRowAccounts(row?: EditableReportRow) {
  if (!row) return '';
  if (row.accountSubjects) return row.accountSubjects;
  if (row.rowType === 'section') return '-';
  if (row.rowType === 'total') return '表内项目';
  return row.ruleExpression;
}

function createSubjectRulesFromAccounts(accounts?: string): SubjectRuleLine[] {
  return (accounts ?? '')
    .split(/[、,+，]/)
    .map((subject) => subject.trim())
    .filter((subject) => subject && subject !== '-' && !subject.startsWith('行 '))
    .map((subject, index) => ({
      id: `subject-rule-${index}-${subject.replace(/\s+/g, '-')}`,
      subject,
      operator: '+',
      valueRule: '余额'
    }));
}

function getSubjectRules(row?: EditableReportRow) {
  if (!row || row.rowType === 'section' || row.rowType === 'total') return [];
  if (row.subjectRules?.length) return row.subjectRules;
  return createSubjectRulesFromAccounts(row.accountSubjects);
}

function getProjectValueRange(row?: EditableReportRow) {
  if (!row || row.rowType === 'section') return '';
  if (row.rowType === 'total') return '表内公式';
  return row.valueRange || '余额';
}

function buildFormulaPreview(row?: EditableReportRow) {
  if (!row) return '';
  if (row.rowType === 'section') return '分组标题不参与取数。';
  if (row.rowType === 'total') return row.ruleExpression;
  const subjectRules = getSubjectRules(row);
  if (subjectRules.length === 0) return row.ruleExpression;
  return subjectRules
    .map((rule, index) => {
      const expression = `${rule.subject}的${rule.valueRule}`;
      if (index === 0) return expression;
      return `${rule.operator} ${expression}`;
    })
    .join(' ');
}

function createSmallBalanceRows(): EditableReportRow[] {
  const cashRules: SubjectRuleLine[] = [
    { id: 'cash-1001', subject: '1001 库存现金', operator: '+', valueRule: '余额' },
    { id: 'cash-1002', subject: '1002 银行存款', operator: '+', valueRule: '余额' },
    { id: 'cash-1012', subject: '1012 其他货币资金', operator: '+', valueRule: '余额' }
  ];
  return [
    { id: 'asset-section-current', side: 'asset', item: '流动资产：', lineNo: '', accountSubjects: '-', valueRange: '余额', ruleType: '分组标题', ruleExpression: '仅显示分组，不参与计算', source: '-', enabled: true, rowType: 'section' },
    { id: 'asset-cash', side: 'asset', item: '货币资金', lineNo: '1', accountSubjects: '1001 库存现金、1002 银行存款、1012 其他货币资金', subjectRules: cashRules, valueRange: '余额', ruleType: '科目余额', ruleExpression: '取借方余额；若出现贷方余额则进入异常校验', source: '总账余额表', enabled: true },
    { id: 'asset-short-invest', side: 'asset', item: '短期投资', lineNo: '2', accountSubjects: '1101 短期投资', valueRange: '余额', ruleType: '科目余额', ruleExpression: '取借方余额，按投资类别汇总后列示', source: '总账余额表', enabled: true },
    { id: 'asset-receivable', side: 'asset', item: '应收账款', lineNo: '3', accountSubjects: '1122 应收账款、2203 预收账款', valueRange: '余额', ruleType: '重分类', ruleExpression: '应收账款借方余额 + 预收账款借方余额', source: '往来辅助余额', enabled: true },
    { id: 'asset-inventory', side: 'asset', item: '存货', lineNo: '4', accountSubjects: '1401 材料采购、1403 原材料、库存商品', valueRange: '余额', ruleType: '科目汇总', ruleExpression: '取存货类科目借方余额合计，排除已结转成本项目', source: '存货明细账', enabled: true },
    { id: 'asset-current-total', side: 'asset', item: '流动资产合计', lineNo: '10', accountSubjects: '行 1 至行 4', valueRange: '余额', ruleType: '表内公式', ruleExpression: '行 1 + 行 2 + 行 3 + 行 4', source: '报表公式', enabled: true, rowType: 'total' },
    { id: 'asset-section-noncurrent', side: 'asset', item: '非流动资产：', lineNo: '', accountSubjects: '-', valueRange: '余额', ruleType: '分组标题', ruleExpression: '仅显示分组，不参与计算', source: '-', enabled: true, rowType: 'section' },
    { id: 'asset-fixed', side: 'asset', item: '固定资产原价', lineNo: '21', accountSubjects: '1601 固定资产', valueRange: '余额', ruleType: '科目余额', ruleExpression: '取固定资产原值，按资产卡片与总账双向校验', source: '固定资产卡片', enabled: true },
    { id: 'asset-depreciation', side: 'asset', item: '减：累计折旧', lineNo: '22', accountSubjects: '1602 累计折旧', valueRange: '余额', ruleType: '科目余额', ruleExpression: '取贷方余额，表样显示为扣减项目', source: '固定资产卡片', enabled: true },
    { id: 'asset-total', side: 'asset', item: '资产总计', lineNo: '40', accountSubjects: '流动资产合计、非流动资产合计', valueRange: '余额', ruleType: '表内公式', ruleExpression: '流动资产合计 + 非流动资产合计', source: '报表公式', enabled: true, rowType: 'total' },
    { id: 'liability-section-current', side: 'liability', item: '流动负债：', lineNo: '', accountSubjects: '-', valueRange: '余额', ruleType: '分组标题', ruleExpression: '仅显示分组，不参与计算', source: '-', enabled: true, rowType: 'section' },
    { id: 'liability-payable', side: 'liability', item: '应付账款', lineNo: '51', accountSubjects: '2202 应付账款、1122 应收账款', valueRange: '余额', ruleType: '重分类', ruleExpression: '应付账款贷方余额 + 应收账款贷方余额', source: '往来辅助余额', enabled: true },
    { id: 'liability-advance', side: 'liability', item: '预收账款', lineNo: '52', accountSubjects: '2203 预收账款', valueRange: '余额', ruleType: '科目余额', ruleExpression: '取贷方余额；借方余额重分类至应收账款', source: '总账余额表', enabled: true },
    { id: 'liability-total', side: 'liability', item: '负债合计', lineNo: '80', accountSubjects: '流动负债合计、非流动负债合计', valueRange: '余额', ruleType: '表内公式', ruleExpression: '流动负债合计 + 非流动负债合计', source: '报表公式', enabled: true, rowType: 'total' },
    { id: 'equity-section', side: 'liability', item: '所有者权益：', lineNo: '', accountSubjects: '-', valueRange: '余额', ruleType: '分组标题', ruleExpression: '仅显示分组，不参与计算', source: '-', enabled: true, rowType: 'section' },
    { id: 'equity-capital', side: 'liability', item: '实收资本', lineNo: '91', accountSubjects: '3001 实收资本', valueRange: '余额', ruleType: '科目余额', ruleExpression: '取贷方余额，按投资人辅助核算穿透', source: '总账余额表', enabled: true },
    { id: 'equity-profit', side: 'liability', item: '未分配利润', lineNo: '92', accountSubjects: '3104 利润分配、3131 本年利润', valueRange: '余额', ruleType: '结转规则', ruleExpression: '利润分配余额 + 本年利润结转后余额', source: '利润分配明细账', enabled: true },
    { id: 'liability-equity-total', side: 'liability', item: '负债和所有者权益总计', lineNo: '100', accountSubjects: '负债合计、所有者权益合计', valueRange: '余额', ruleType: '表内公式', ruleExpression: '负债合计 + 所有者权益合计', source: '报表公式', enabled: true, rowType: 'total' }
  ];
}

function createProfitRows(): EditableReportRow[] {
  return [
    { id: 'pl-income', side: 'asset', item: '一、营业收入', lineNo: '1', accountSubjects: '6001 主营业务收入、6051 其他业务收入', subjectRules: [
      { id: 'pl-income-6001', subject: '6001 主营业务收入', operator: '+', valueRule: '贷方发生额' },
      { id: 'pl-income-6051', subject: '6051 其他业务收入', operator: '+', valueRule: '贷方发生额' }
    ], valueRange: '贷方发生额', ruleType: '科目汇总', ruleExpression: '主营业务收入贷方发生额 + 其他业务收入贷方发生额', source: '总账发生额表', enabled: true },
    { id: 'pl-cost', side: 'asset', item: '减：营业成本', lineNo: '2', accountSubjects: '6401 主营业务成本、6402 其他业务成本', subjectRules: [
      { id: 'pl-cost-6401', subject: '6401 主营业务成本', operator: '+', valueRule: '借方发生额' },
      { id: 'pl-cost-6402', subject: '6402 其他业务成本', operator: '+', valueRule: '借方发生额' }
    ], valueRange: '借方发生额', ruleType: '科目汇总', ruleExpression: '主营业务成本借方发生额 + 其他业务成本借方发生额', source: '总账发生额表', enabled: true },
    { id: 'pl-tax', side: 'asset', item: '税金及附加', lineNo: '3', accountSubjects: '6403 税金及附加', subjectRules: [
      { id: 'pl-tax-6403', subject: '6403 税金及附加', operator: '+', valueRule: '借方发生额' }
    ], valueRange: '借方发生额', ruleType: '科目余额', ruleExpression: '取税金及附加借方发生额', source: '总账发生额表', enabled: true },
    { id: 'pl-selling', side: 'asset', item: '销售费用', lineNo: '4', accountSubjects: '6601 销售费用', subjectRules: [
      { id: 'pl-selling-6601', subject: '6601 销售费用', operator: '+', valueRule: '借方发生额' }
    ], valueRange: '借方发生额', ruleType: '科目余额', ruleExpression: '取销售费用借方发生额', source: '总账发生额表', enabled: true },
    { id: 'pl-admin', side: 'asset', item: '管理费用', lineNo: '5', accountSubjects: '6602 管理费用', subjectRules: [
      { id: 'pl-admin-6602', subject: '6602 管理费用', operator: '+', valueRule: '借方发生额' }
    ], valueRange: '借方发生额', ruleType: '科目余额', ruleExpression: '取管理费用借方发生额', source: '总账发生额表', enabled: true },
    { id: 'pl-profit', side: 'asset', item: '二、营业利润', lineNo: '20', accountSubjects: '行 1 - 行 2 - 行 3 - 行 4 - 行 5', valueRange: '表内公式', ruleType: '表内公式', ruleExpression: '行 1 - 行 2 - 行 3 - 行 4 - 行 5', source: '报表公式', enabled: true, rowType: 'total' },
    { id: 'pl-non-income', side: 'asset', item: '加：营业外收入', lineNo: '21', accountSubjects: '6301 营业外收入', subjectRules: [
      { id: 'pl-non-income-6301', subject: '6301 营业外收入', operator: '+', valueRule: '贷方发生额' }
    ], valueRange: '贷方发生额', ruleType: '科目余额', ruleExpression: '取营业外收入贷方发生额', source: '总账发生额表', enabled: true },
    { id: 'pl-non-cost', side: 'asset', item: '减：营业外支出', lineNo: '22', accountSubjects: '6711 营业外支出', subjectRules: [
      { id: 'pl-non-cost-6711', subject: '6711 营业外支出', operator: '+', valueRule: '借方发生额' }
    ], valueRange: '借方发生额', ruleType: '科目余额', ruleExpression: '取营业外支出借方发生额', source: '总账发生额表', enabled: true },
    { id: 'pl-total', side: 'asset', item: '三、利润总额', lineNo: '30', accountSubjects: '营业利润 + 营业外收入 - 营业外支出', valueRange: '表内公式', ruleType: '表内公式', ruleExpression: '行 20 + 行 21 - 行 22', source: '报表公式', enabled: true, rowType: 'total' },
    { id: 'pl-tax-cost', side: 'asset', item: '减：所得税费用', lineNo: '31', accountSubjects: '6801 所得税费用', subjectRules: [
      { id: 'pl-tax-cost-6801', subject: '6801 所得税费用', operator: '+', valueRule: '借方发生额' }
    ], valueRange: '借方发生额', ruleType: '科目余额', ruleExpression: '取所得税费用借方发生额', source: '总账发生额表', enabled: true },
    { id: 'pl-net', side: 'asset', item: '四、净利润', lineNo: '40', accountSubjects: '利润总额 - 所得税费用', valueRange: '表内公式', ruleType: '表内公式', ruleExpression: '行 30 - 行 31', source: '报表公式', enabled: true, rowType: 'total' }
  ];
}

function isProfitReport(report?: ReportConfig) {
  return Boolean(report?.name.includes('利润') || report?.id.includes('pl'));
}

function createEditableRowsForReport(report?: ReportConfig) {
  return isProfitReport(report) ? createProfitRows() : createSmallBalanceRows();
}

function createTemplateRuleGroups(standardId: string): RuleGroup[] {
  const prefix = standardId === 'cas' ? 'cas' : 'small';
  return [
    {
      id: `${prefix}-mapping`,
      name: '科目取数规则',
      description: '维护报表项目行与会计科目的加减关系和取值口径。',
      scope: '项目行取数',
      rules: [
        {
          id: `${prefix}-map-required`,
          name: '普通项目必须绑定科目',
          condition: '报表项目行为普通项目且未绑定科目',
          action: '发布前提示科目漏绑，要求补充或改为表内公式',
          severity: 'blocker',
          enabled: true,
          priority: 10
        },
        {
          id: `${prefix}-map-operator`,
          name: '科目支持加减运算',
          condition: '同一项目需要多科目汇总或扣减',
          action: '按科目行的 + / - 运算符生成项目取数规则',
          severity: 'info',
          enabled: true,
          priority: 30
        }
      ]
    },
    {
      id: `${prefix}-formula`,
      name: '表内公式规则',
      description: '维护合计行、利润行等表内项目加减公式。',
      scope: '表内计算',
      rules: [
        {
          id: `${prefix}-formula-total`,
          name: '合计行引用项目行',
          condition: '行类型为合计校验行',
          action: '仅允许引用同表项目行，发布前检查循环引用',
          severity: 'warning',
          enabled: true,
          priority: 20
        }
      ]
    },
    {
      id: `${prefix}-validation`,
      name: '发布校验规则',
      description: '检查报表平衡、漏绑科目、重复科目和影响范围。',
      scope: '发布前校验',
      rules: [
        {
          id: `${prefix}-balance`,
          name: '资产负债表平衡',
          condition: '资产总计与负债和所有者权益总计不一致',
          action: '阻断发布并定位差异来源',
          severity: 'blocker',
          enabled: true,
          priority: 5
        },
        {
          id: `${prefix}-impact`,
          name: '发布影响范围提示',
          condition: '点击发布配置',
          action: '明确仅影响未来新建客户账套，不覆盖已有账套',
          severity: 'warning',
          enabled: true,
          priority: 15
        }
      ]
    }
  ];
}

function getPairedBalancePreview(standard: AccountingStandard, report: ReportConfig): ReportPreview {
  const isIfrs = standard.id === 'ifrs';
  const isNgo = standard.id === 'ngo';
  return {
    layout: 'paired',
    title: isIfrs ? 'Statement of Financial Position' : report.name,
    unit: isIfrs ? 'Unit: RMB yuan' : '单位：元',
    leftTitle: isIfrs ? 'Assets' : '资产',
    rightTitle: isNgo ? '负债和净资产' : isIfrs ? 'Liabilities and Equity' : '负债和所有者权益',
    leftRows: isNgo
      ? [
        ['流动资产：', '', '', ''],
        ['货币资金', '1', '2,418,650.38', '1,936,244.16'],
        ['短期投资', '2', '680,000.00', '520,000.00'],
        ['应收款项', '3', '392,810.44', '318,205.19'],
        ['存货', '4', '118,420.00', '95,160.00'],
        ['流动资产合计', '10', '3,609,880.82', '2,869,609.35'],
        ['非流动资产：', '', '', ''],
        ['固定资产原价', '21', '1,206,400.00', '1,184,600.00'],
        ['减：累计折旧', '22', '386,920.00', '312,540.00'],
        ['固定资产净值', '23', '819,480.00', '872,060.00'],
        ['资产总计', '40', '4,429,360.82', '3,741,669.35']
      ]
      : [
        [isIfrs ? 'Current assets' : '流动资产：', '', '', ''],
        [isIfrs ? 'Cash and cash equivalents' : '货币资金', '1', '12,486,320.40', '10,934,882.17'],
        [isIfrs ? 'Trade receivables' : '应收账款', '2', '8,214,600.00', '7,902,140.00'],
        [isIfrs ? 'Inventories' : '存货', '3', '5,906,318.88', '5,481,002.36'],
        [isIfrs ? 'Total current assets' : '流动资产合计', '11', '30,887,239.28', '27,498,024.53'],
        [isIfrs ? 'Non-current assets' : '非流动资产：', '', '', ''],
        [isIfrs ? 'Property, plant and equipment' : '固定资产', '21', '18,240,700.00', '17,692,410.00'],
        [isIfrs ? 'Right-of-use assets' : '使用权资产', '22', '2,418,000.00', '2,765,000.00'],
        [isIfrs ? 'Deferred tax assets' : '递延所得税资产', '23', '716,820.00', '658,410.00'],
        [isIfrs ? 'Total assets' : '资产总计', '40', '52,262,759.28', '48,613,844.53']
      ],
    rightRows: isNgo
      ? [
        ['流动负债：', '', '', ''],
        ['应付款项', '51', '286,460.00', '241,980.00'],
        ['预收账款', '52', '142,300.00', '108,200.00'],
        ['流动负债合计', '60', '428,760.00', '350,180.00'],
        ['非流动负债：', '', '', ''],
        ['长期应付款', '71', '180,000.00', '220,000.00'],
        ['负债合计', '80', '608,760.00', '570,180.00'],
        ['净资产：', '', '', ''],
        ['非限定性净资产', '91', '2,476,880.82', '2,181,489.35'],
        ['限定性净资产', '92', '1,343,720.00', '990,000.00'],
        ['净资产合计', '99', '3,820,600.82', '3,171,489.35'],
        ['负债和净资产总计', '100', '4,429,360.82', '3,741,669.35']
      ]
      : [
        [isIfrs ? 'Current liabilities' : '流动负债：', '', '', ''],
        [isIfrs ? 'Trade and other payables' : '应付账款', '51', '7,086,210.11', '6,880,460.30'],
        [isIfrs ? 'Contract liabilities' : '合同负债', '52', '3,520,000.00', '2,940,000.00'],
        [isIfrs ? 'Total current liabilities' : '流动负债合计', '60', '14,246,210.11', '13,210,460.30'],
        [isIfrs ? 'Non-current liabilities' : '非流动负债：', '', '', ''],
        [isIfrs ? 'Lease liabilities' : '租赁负债', '71', '1,638,400.00', '1,902,000.00'],
        [isIfrs ? 'Deferred tax liabilities' : '递延所得税负债', '72', '428,320.00', '396,210.00'],
        [isIfrs ? 'Total liabilities' : '负债合计', '80', '18,872,930.11', '17,508,670.30'],
        [isIfrs ? 'Equity' : '所有者权益：', '', '', ''],
        [isIfrs ? 'Share capital' : '实收资本', '91', '20,000,000.00', '20,000,000.00'],
        [isIfrs ? 'Retained earnings' : '未分配利润', '92', '13,389,829.17', '11,105,174.23'],
        [isIfrs ? 'Total liabilities and equity' : '负债和所有者权益总计', '100', '52,262,759.28', '48,613,844.53']
      ]
  };
}

function getSingleReportPreview(standard: AccountingStandard, report: ReportConfig): ReportPreview {
  const reportKey = `${standard.id}-${report.id}-${report.name}`;
  if (reportKey.includes('pl') || reportKey.includes('income') || report.name.includes('利润')) {
    return {
      layout: 'single',
      title: standard.id === 'ifrs' ? 'Statement of Profit or Loss' : report.name,
      unit: standard.id === 'ifrs' ? 'Unit: RMB yuan' : '单位：元',
      columns: ['项目', '行次', '本期金额', '上期金额'],
      rows: [
        { cells: ['一、营业收入', '1', '18,742,360.60', '16,980,422.31'] },
        { cells: ['减：营业成本', '2', '10,386,214.45', '9,842,110.26'] },
        { cells: ['税金及附加', '3', '184,620.33', '172,530.08'] },
        { cells: ['销售费用', '4', '1,526,880.00', '1,409,610.00'] },
        { cells: ['管理费用', '5', '2,138,420.19', '1,962,502.45'] },
        { cells: ['研发费用', '6', '1,082,300.00', '896,440.00'] },
        { cells: ['财务费用', '7', '126,930.27', '118,400.62'] },
        { cells: ['加：其他收益', '12', '418,000.00', '286,000.00'] },
        { type: 'total', cells: ['二、营业利润', '20', '3,715,995.36', '2,864,828.90'] },
        { cells: ['加：营业外收入', '21', '36,800.00', '21,500.00'] },
        { cells: ['减：营业外支出', '22', '18,460.00', '15,600.00'] },
        { type: 'total', cells: ['三、利润总额', '30', '3,734,335.36', '2,870,728.90'] },
        { cells: ['减：所得税费用', '31', '612,540.00', '498,260.00'] },
        { type: 'total', cells: ['四、净利润', '40', '3,121,795.36', '2,372,468.90'] }
      ]
    };
  }

  if (reportKey.includes('cf') || report.name.includes('现金流')) {
    return {
      layout: 'single',
      title: report.name,
      unit: '单位：元',
      columns: ['项目', '行次', '本期金额', '上期金额'],
      rows: [
        { type: 'section', cells: ['一、经营活动产生的现金流量：', '', '', ''] },
        { cells: ['销售商品、提供劳务收到的现金', '1', '20,286,400.00', '18,492,620.00'] },
        { cells: ['收到的税费返还', '2', '286,000.00', '196,400.00'] },
        { cells: ['购买商品、接受劳务支付的现金', '5', '11,620,800.00', '10,884,320.00'] },
        { cells: ['支付给职工以及为职工支付的现金', '6', '3,840,600.00', '3,512,940.00'] },
        { type: 'total', cells: ['经营活动产生的现金流量净额', '10', '3,964,120.00', '3,108,460.00'] },
        { type: 'section', cells: ['二、投资活动产生的现金流量：', '', '', ''] },
        { cells: ['购建固定资产支付的现金', '18', '1,420,000.00', '1,085,000.00'] },
        { type: 'total', cells: ['投资活动产生的现金流量净额', '25', '-1,284,000.00', '-948,000.00'] },
        { type: 'section', cells: ['三、筹资活动产生的现金流量：', '', '', ''] },
        { cells: ['取得借款收到的现金', '31', '2,000,000.00', '1,600,000.00'] },
        { cells: ['偿还债务支付的现金', '34', '1,200,000.00', '1,100,000.00'] },
        { type: 'total', cells: ['现金及现金等价物净增加额', '50', '1,552,120.00', '1,060,460.00'] }
      ]
    };
  }

  if (reportKey.includes('equity')) {
    return {
      layout: 'single',
      title: report.name,
      unit: '单位：元',
      columns: ['项目', '实收资本', '资本公积', '盈余公积', '未分配利润', '所有者权益合计'],
      rows: [
        { cells: ['一、上年年末余额', '20,000,000.00', '4,128,000.00', '1,840,000.00', '11,105,174.23', '37,073,174.23'] },
        { cells: ['会计政策变更', '-', '-', '-', '-', '-'] },
        { type: 'total', cells: ['二、本年年初余额', '20,000,000.00', '4,128,000.00', '1,840,000.00', '11,105,174.23', '37,073,174.23'] },
        { cells: ['三、本年增减变动金额', '-', '286,400.00', '312,180.00', '2,284,654.94', '2,883,234.94'] },
        { cells: ['综合收益总额', '-', '-', '-', '3,121,795.36', '3,121,795.36'] },
        { cells: ['利润分配', '-', '-', '312,180.00', '-837,140.42', '-524,960.42'] },
        { type: 'total', cells: ['四、本年年末余额', '20,000,000.00', '4,414,400.00', '2,152,180.00', '13,389,829.17', '39,956,409.17'] }
      ]
    };
  }

  if (reportKey.includes('tax-adjust')) {
    return {
      layout: 'single',
      title: report.name,
      unit: '单位：元',
      columns: ['项目', '账载金额', '税收金额', '调增金额', '调减金额'],
      rows: [
        { cells: ['一、收入类调整项目', '18,742,360.60', '18,886,120.60', '143,760.00', '-'] },
        { cells: ['二、扣除类调整项目', '14,621,224.91', '14,338,004.91', '283,220.00', '-'] },
        { cells: ['职工薪酬支出', '3,840,600.00', '3,840,600.00', '-', '-'] },
        { cells: ['业务招待费支出', '286,400.00', '171,840.00', '114,560.00', '-'] },
        { cells: ['广告费和业务宣传费', '1,120,000.00', '951,340.00', '168,660.00', '-'] },
        { cells: ['三、资产类调整项目', '716,820.00', '658,410.00', '58,410.00', '-'] },
        { type: 'total', cells: ['纳税调整合计', '—', '—', '485,390.00', '-'] }
      ]
    };
  }

  if (reportKey.includes('small-tax')) {
    return {
      layout: 'single',
      title: report.name,
      unit: '单位：元',
      columns: ['栏次', '项目', '本期数', '本年累计'],
      rows: [
        { cells: ['1', '应征增值税不含税销售额（3%征收率）', '824,600.00', '2,418,900.00'] },
        { cells: ['2', '税务机关代开的增值税专用发票不含税销售额', '126,400.00', '386,200.00'] },
        { cells: ['3', '免税销售额', '92,000.00', '184,000.00'] },
        { cells: ['8', '本期应纳税额', '24,738.00', '72,567.00'] },
        { cells: ['11', '本期应纳税额减征额', '4,260.00', '12,800.00'] },
        { type: 'total', cells: ['20', '本期应补（退）税额', '20,478.00', '59,767.00'] }
      ]
    };
  }

  if (reportKey.includes('lease')) {
    return {
      layout: 'single',
      title: report.name,
      unit: 'Unit: RMB yuan',
      columns: ['Maturity analysis', 'Within 1 year', '1-5 years', 'Over 5 years', 'Total'],
      rows: [
        { cells: ['Lease payments', '824,000.00', '2,418,000.00', '680,000.00', '3,922,000.00'] },
        { cells: ['Unearned finance charges', '-96,400.00', '-328,000.00', '-84,000.00', '-508,400.00'] },
        { type: 'total', cells: ['Present value of lease liabilities', '727,600.00', '2,090,000.00', '596,000.00', '3,413,600.00'] }
      ]
    };
  }

  if (reportKey.includes('activity')) {
    return {
      layout: 'single',
      title: report.name,
      unit: '单位：元',
      columns: ['项目', '非限定性', '限定性', '合计', '上期合计'],
      rows: [
        { type: 'section', cells: ['一、收入', '', '', '', ''] },
        { cells: ['捐赠收入', '426,000.00', '1,240,000.00', '1,666,000.00', '1,352,000.00'] },
        { cells: ['会费收入', '318,000.00', '-', '318,000.00', '296,000.00'] },
        { cells: ['提供服务收入', '186,400.00', '-', '186,400.00', '142,600.00'] },
        { type: 'total', cells: ['收入合计', '930,400.00', '1,240,000.00', '2,170,400.00', '1,790,600.00'] },
        { type: 'section', cells: ['二、费用', '', '', '', ''] },
        { cells: ['业务活动成本', '318,600.00', '826,000.00', '1,144,600.00', '982,400.00'] },
        { cells: ['管理费用', '286,900.00', '-', '286,900.00', '260,300.00'] },
        { type: 'total', cells: ['本期净资产变动额', '324,900.00', '414,000.00', '738,900.00', '547,900.00'] }
      ]
    };
  }

  if (reportKey.includes('project')) {
    return {
      layout: 'single',
      title: report.name,
      unit: '单位：元',
      columns: ['项目编号', '项目名称', '资金来源', '本期收入', '本期支出', '期末结余'],
      rows: [
        { cells: ['PRJ-2026-014', '青少年科学教育', '限定性捐赠', '680,000.00', '426,800.00', '253,200.00'] },
        { cells: ['PRJ-2026-021', '社区助老服务', '政府购买服务', '420,000.00', '318,600.00', '101,400.00'] },
        { cells: ['PRJ-2026-033', '公益伙伴培训', '非限定性收入', '186,400.00', '142,800.00', '43,600.00'] },
        { type: 'total', cells: ['合计', '', '', '1,286,400.00', '888,200.00', '398,200.00'] }
      ]
    };
  }

  return {
    layout: 'single',
    title: report.name,
    unit: '单位：元',
    columns: ['项目', '行次', '本期金额', '上期金额'],
    rows: [
      { cells: ['报表项目一', '1', '1,240,000.00', '1,128,000.00'] },
      { cells: ['报表项目二', '2', '826,400.00', '742,200.00'] },
      { type: 'total', cells: ['合计', '10', '2,066,400.00', '1,870,200.00'] }
    ]
  };
}

function getReportPreview(standard: AccountingStandard | undefined, report: ReportConfig | undefined): ReportPreview | undefined {
  if (!standard || !report) return undefined;
  const reportKey = `${standard.id}-${report.id}-${report.name}-${report.code}`;
  if (
    reportKey.includes('bs') ||
    reportKey.includes('position') ||
    report.name.includes('资产负债') ||
    report.name.includes('Financial Position')
  ) {
    return getPairedBalancePreview(standard, report);
  }
  return getSingleReportPreview(standard, report);
}

function cloneStandards(value: AccountingStandard[]) {
  return value
    .filter((standard) => ['cas', 'small'].includes(standard.id))
    .map((standard) => ({
    ...standard,
    description: standard.id === 'cas'
      ? '作为企业会计准则新建客户账套的初始报表模板，覆盖资产负债表与利润表。'
      : '作为小企业会计准则新建客户账套的初始报表模板，覆盖常用财务报表。',
    reports: standard.reports
      .filter((report) => report.name.includes('资产负债表') || report.name.includes('利润表'))
      .map((report) => ({
        ...report,
        owner: '后台会计',
        requiredFields: [...report.requiredFields]
      })),
    ruleGroups: createTemplateRuleGroups(standard.id)
  }));
}

const Component = forwardRef<AxureHandle, AxureProps>(function ReportRuleConfiguration(innerProps, ref) {
  const dataSource = innerProps?.data ?? {};
  const configSource = innerProps?.config ?? {};
  const onEventHandler = typeof innerProps?.onEvent === 'function' ? innerProps.onEvent : undefined;

  const initialStandards = useMemo(() => {
    return Array.isArray(dataSource.standards) && dataSource.standards.length > 0
      ? cloneStandards(dataSource.standards as AccountingStandard[])
      : cloneStandards(DEFAULT_STANDARDS);
  }, [dataSource.standards]);

  const [standards, setStandards] = useState<AccountingStandard[]>(initialStandards);
  const initialSmallStandard = initialStandards.find((standard) => standard.id === 'small') ?? initialStandards[0];
  const [pageMode, setPageMode] = useState<PageMode>('overview');
  const [selectedStandardId, setSelectedStandardId] = useState(initialSmallStandard?.id ?? '');
  const [selectedReportId, setSelectedReportId] = useState(
    initialSmallStandard?.reports.find((report) => report.id === 'small-bs')?.id
    ?? initialSmallStandard?.reports[0]?.id
    ?? ''
  );
  const [publishing, setPublishing] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const initialEditableReport = initialSmallStandard?.reports.find((report) => report.id === 'small-bs')
    ?? initialSmallStandard?.reports[0];
  const [editableRows, setEditableRows] = useState<EditableReportRow[]>(() => createEditableRowsForReport(initialEditableReport));
  const [selectedEditableRowId, setSelectedEditableRowId] = useState('asset-cash');

  const title = String(configSource.title ?? '报表规则模板配置');
  const subtitle = String(configSource.subtitle ?? '后台统一维护新建客户账套的初始报表规则');
  const tenantName = String(configSource.tenantName ?? '默认模板库');

  const currentStandard = useMemo(() => {
    return standards.find((standard) => standard.id === selectedStandardId) ?? standards[0];
  }, [selectedStandardId, standards]);

  const currentReport = useMemo(() => {
    return currentStandard?.reports.find((report) => report.id === selectedReportId)
      ?? currentStandard?.reports[0];
  }, [currentStandard, selectedReportId]);

  const currentPreview = useMemo(() => {
    return getReportPreview(currentStandard, currentReport);
  }, [currentReport, currentStandard]);

  const enabledReportCount = useMemo(() => {
    return currentStandard?.reports.filter((report) => report.enabled).length ?? 0;
  }, [currentStandard]);

  const allRules = useMemo(() => {
    return currentStandard?.ruleGroups.flatMap((group) => group.rules) ?? [];
  }, [currentStandard]);

  const enabledRuleCount = useMemo(() => {
    return allRules.filter((rule) => rule.enabled).length;
  }, [allRules]);

  const previewWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (currentStandard?.reports.some((report) => report.status === 'risk' && report.enabled)) {
      warnings.push('存在已启用但仍有风险的报表，请检查关联规则。');
    }
    if (allRules.some((rule) => rule.severity === 'blocker' && !rule.enabled)) {
      warnings.push('存在阻断级规则未启用，发布前建议复核。');
    }
    if ((currentStandard?.pendingChanges ?? 0) > 8) {
      warnings.push('待发布变更较多，建议先保存草稿并安排复核。');
    }
    return warnings;
  }, [allRules, currentStandard]);

  const selectedEditableRow = useMemo(() => {
    return editableRows.find((row) => row.id === selectedEditableRowId) ?? editableRows[0];
  }, [editableRows, selectedEditableRowId]);

  const editableRowPairs = useMemo(() => {
    const assetRows = editableRows.filter((row) => row.side === 'asset');
    const liabilityRows = editableRows.filter((row) => row.side === 'liability');
    return Array.from({ length: Math.max(assetRows.length, liabilityRows.length) }).map((_, index) => ({
      asset: assetRows[index],
      liability: liabilityRows[index]
    }));
  }, [editableRows]);

  const emitEvent = useCallback(
    (name: string, payload?: unknown) => {
      onEventHandler?.(name, payload === undefined ? undefined : safePayload(payload));
    },
    [onEventHandler]
  );

  const handleStandardChange = useCallback(
    (standardId: string) => {
      const nextStandard = standards.find((standard) => standard.id === standardId);
      if (!nextStandard) return;
      setSelectedStandardId(standardId);
      setSelectedReportId(nextStandard.reports[0]?.id ?? '');
      emitEvent('onStandardChange', nextStandard);
    },
    [emitEvent, standards]
  );

  const handleReportSelect = useCallback(
    (report: ReportConfig) => {
      setSelectedReportId(report.id);
      emitEvent('onReportSelect', report);
    },
    [emitEvent]
  );

  const handleOpenReportDetail = useCallback(
    (report: ReportConfig) => {
      const nextRows = createEditableRowsForReport(report);
      setSelectedReportId(report.id);
      setEditableRows(nextRows);
      setSelectedEditableRowId(nextRows[0]?.id ?? '');
      setPageMode('detail');
      emitEvent('onOpenReportDetail', report);
    },
    [emitEvent]
  );

  const handleReportToggle = useCallback(
    (reportId: string) => {
      const report = currentStandard?.reports.find((item) => item.id === reportId);
      if (!currentStandard || !report) return;
      const nextEnabled = !report.enabled;
      setStandards((items) => items.map((standard) => {
        if (standard.id !== currentStandard.id) return standard;
        return {
          ...standard,
          pendingChanges: standard.pendingChanges + 1,
          reports: standard.reports.map((item) => (
            item.id === reportId ? { ...item, enabled: nextEnabled } : item
          ))
        };
      }));
      emitEvent('onReportToggle', { standardId: currentStandard.id, reportId, enabled: nextEnabled });
    },
    [currentStandard, emitEvent]
  );

  const handleRuleToggle = useCallback(
    (ruleId: string) => {
      const rule = allRules.find((item) => item.id === ruleId);
      if (!currentStandard || !rule) return;
      const nextEnabled = !rule.enabled;
      setStandards((items) => items.map((standard) => {
        if (standard.id !== currentStandard.id) return standard;
        return {
          ...standard,
          pendingChanges: standard.pendingChanges + 1,
          ruleGroups: standard.ruleGroups.map((group) => ({
            ...group,
            rules: group.rules.map((item) => (
              item.id === ruleId ? { ...item, enabled: nextEnabled } : item
            ))
          }))
        };
      }));
      emitEvent('onRuleToggle', { standardId: currentStandard.id, ruleId, enabled: nextEnabled });
    },
    [allRules, currentStandard, emitEvent]
  );

  const handleSaveDraft = useCallback(() => {
    emitEvent('onSaveDraft', {
      currentStandard,
      currentReport,
      savedAt: new Date().toISOString()
    });
    message.success('草稿已保存，可继续调整报表和规则');
  }, [currentReport, currentStandard, emitEvent]);

  const handleDetailDraft = useCallback(() => {
    emitEvent('onSaveDraft', {
      currentStandard,
      currentReport,
      rows: editableRows,
      savedAt: new Date().toISOString()
    });
    message.success('表样配置草稿已保存');
  }, [currentReport, currentStandard, editableRows, emitEvent]);

  const handleExport = useCallback(() => {
    emitEvent('onExportRulePack', currentStandard);
    message.success('规则包已生成，可用于初始化模板复核');
  }, [currentStandard, emitEvent]);

  const handlePublish = useCallback(() => {
    setPublishModalOpen(true);
  }, []);

  const handleConfirmPublish = useCallback(() => {
    if (!currentStandard) return;
    setPublishing(true);
    window.setTimeout(() => {
      setStandards((items) => items.map((standard) => (
        standard.id === currentStandard.id
          ? { ...standard, pendingChanges: 0, lastPublished: '2026-06-01 15:30' }
          : standard
      )));
      setPublishing(false);
      setPublishModalOpen(false);
      setPageMode('overview');
      emitEvent('onPublishConfiguration', currentStandard);
      message.success('模板已发布，仅影响未来新建客户账套');
    }, 650);
  }, [currentStandard, emitEvent]);

  const updateEditableRow = useCallback(
    (patch: Partial<EditableReportRow>) => {
      if (!selectedEditableRow) return;
      const nextRow = { ...selectedEditableRow, ...patch };
      setEditableRows((rows) => rows.map((row) => (row.id === selectedEditableRow.id ? nextRow : row)));
      emitEvent('onReportRowChange', nextRow);
    },
    [emitEvent, selectedEditableRow]
  );

  const updateSubjectRuleLine = useCallback(
    (lineId: string, patch: Partial<SubjectRuleLine>) => {
      if (!selectedEditableRow) return;
      const currentRules = getSubjectRules(selectedEditableRow);
      const nextRules = currentRules.map((line) => (line.id === lineId ? { ...line, ...patch } : line));
      updateEditableRow({
        subjectRules: nextRules,
        accountSubjects: nextRules.map((line) => line.subject).filter(Boolean).join('、')
      });
    },
    [selectedEditableRow, updateEditableRow]
  );

  const handleAddSubjectRuleLine = useCallback(() => {
    if (!selectedEditableRow) return;
    const nextRules = [
      ...getSubjectRules(selectedEditableRow),
      {
        id: `subject-rule-${Date.now()}`,
        subject: '请选择科目',
        operator: '+',
        valueRule: '余额'
      } satisfies SubjectRuleLine
    ];
    updateEditableRow({
      subjectRules: nextRules,
      accountSubjects: nextRules.map((line) => line.subject).filter(Boolean).join('、')
    });
  }, [selectedEditableRow, updateEditableRow]);

  const handleDeleteSubjectRuleLine = useCallback(
    (lineId: string) => {
      if (!selectedEditableRow) return;
      const nextRules = getSubjectRules(selectedEditableRow).filter((line) => line.id !== lineId);
      updateEditableRow({
        subjectRules: nextRules,
        accountSubjects: nextRules.map((line) => line.subject).filter(Boolean).join('、')
      });
    },
    [selectedEditableRow, updateEditableRow]
  );

  const handleAddEditableRow = useCallback(() => {
    const subjectRules: SubjectRuleLine[] = [
      { id: `subject-rule-${Date.now()}`, subject: '请选择科目', operator: '+', valueRule: '余额' }
    ];
    const newRow: EditableReportRow = {
      id: `custom-row-${Date.now()}`,
      side: selectedEditableRow?.side ?? 'asset',
      item: '自定义项目',
      lineNo: '自定义',
      accountSubjects: '请选择涉及科目',
      subjectRules,
      valueRange: '余额',
      ruleType: '科目余额',
      ruleExpression: '请选择科目或填写取值公式',
      source: '总账余额表',
      enabled: true
    };
    setEditableRows((rows) => [...rows, newRow]);
    setSelectedEditableRowId(newRow.id);
    emitEvent('onReportRowChange', newRow);
    message.success('已新增一行报表项目');
  }, [emitEvent, selectedEditableRow]);

  const handleDeleteEditableRow = useCallback(() => {
    if (!selectedEditableRow || selectedEditableRow.rowType === 'total') {
      message.warning('合计行保留为表内校验项，不能删除');
      return;
    }
    setEditableRows((rows) => {
      const nextRows = rows.filter((row) => row.id !== selectedEditableRow.id);
      setSelectedEditableRowId(nextRows[0]?.id ?? '');
      return nextRows;
    });
    message.success('已删除当前报表行');
  }, [selectedEditableRow]);

  useImperativeHandle(ref, () => ({
    getVar: (name: string) => {
      const vars: Record<string, unknown> = {
        current_standard: currentStandard,
        current_report: currentReport,
        enabled_report_count: enabledReportCount,
        enabled_rule_count: enabledRuleCount,
        pending_changes: currentStandard?.pendingChanges ?? 0
      };
      return vars[name];
    },
    fireAction: (name: string, params?: string) => {
      if (name === 'switch_standard' && params) handleStandardChange(params);
      if (name === 'toggle_report' && params) handleReportToggle(params);
      if (name === 'toggle_rule' && params) handleRuleToggle(params);
      if (name === 'publish_configuration') handlePublish();
    },
    eventList: EVENT_LIST,
    actionList: ACTION_LIST,
    varList: VAR_LIST,
    configList: CONFIG_LIST,
    dataList: DATA_LIST
  }), [
    currentReport,
    currentStandard,
    enabledReportCount,
    enabledRuleCount,
    handlePublish,
    handleReportToggle,
    handleRuleToggle,
    handleStandardChange
  ]);

  const reportColumns = [
    {
      title: '启用',
      dataIndex: 'enabled',
      width: 76,
      render: (_: boolean, record: ReportConfig) => (
        <Switch
          checked={record.enabled}
          checkedChildren="开"
          unCheckedChildren="关"
          onChange={() => handleReportToggle(record.id)}
        />
      )
    },
    {
      title: '报表名称',
      dataIndex: 'name',
      render: (_: string, record: ReportConfig) => {
        const selected = record.id === currentReport?.id;
        return (
          <button
            className={`report-table-name${selected ? ' report-table-name--selected' : ''}`}
            type="button"
            onClick={() => handleReportSelect(record)}
          >
            <strong>{record.name}</strong>
            <span>{record.code}</span>
          </button>
        );
      }
    },
    {
      title: '周期',
      dataIndex: 'period',
      width: 132,
      render: (value: string) => <span className="report-nowrap">{value}</span>
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 94,
      render: (value: ReportStatus) => {
        const meta = statusMeta(value);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      }
    },
    {
      title: '关联规则',
      dataIndex: 'linkedRules',
      width: 102,
      render: (value: number) => <Badge color="#1e3a5f" text={`${value} 条`} />
    },
    {
      title: '负责人',
      dataIndex: 'owner',
      width: 122
    },
    {
      title: '操作',
      width: 92,
      render: (_: unknown, record: ReportConfig) => (
        <Button size="small" type="link" onClick={() => handleOpenReportDetail(record)}>
          配置
        </Button>
      )
    }
  ];

  const metrics = [
    {
      label: '准则版本',
      value: currentStandard?.version ?? '-',
      hint: '用于未来新建账套',
      icon: <BankOutlined />
    },
    {
      label: '已配置报表数',
      value: `${enabledReportCount}/${currentStandard?.reports.length ?? 0}`,
      hint: '资产负债表 / 利润表',
      icon: <FileDoneOutlined />
    },
    {
      label: '生效规则',
      value: String(enabledRuleCount),
      hint: `${allRules.length} 条规则总数`,
      icon: <ControlOutlined />
    },
    {
      label: '待发布变更',
      value: String(currentStandard?.pendingChanges ?? 0),
      hint: currentStandard?.lastPublished ? `最近发布 ${currentStandard.lastPublished}` : '暂无发布记录',
      icon: <AuditOutlined />
    }
  ];

  const detailIsProfitReport = isProfitReport(currentReport);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#7566F1',
          colorSuccess: '#2DBE72',
          colorWarning: '#F5A623',
          borderRadius: 8,
          fontFamily: 'Inter, "PingFang SC", "Microsoft YaHei", Arial, sans-serif'
        }
      }}
    >
      <main className="report-config">
        <aside className="service-rail" aria-label="服务商后台导航">
          <button className="service-rail__item service-rail__item--active" type="button" aria-label="报表配置">
            <FileProtectOutlined />
          </button>
          <button className="service-rail__item" type="button" aria-label="准则账册">
            <BankOutlined />
          </button>
          <button className="service-rail__item" type="button" aria-label="规则编排">
            <ControlOutlined />
          </button>
          <button className="service-rail__item" type="button" aria-label="发布审计">
            <AuditOutlined />
          </button>
        </aside>

        <div className="report-config__body">
          <header className="report-config__header">
            <div className="report-config__title-block">
              <div className="report-config__eyebrow">
                <FileProtectOutlined />
                <span>{tenantName}</span>
              </div>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
            <div className="report-config__toolbar">
              <div className="report-config__tabs" aria-label="配置状态筛选">
                <button className="report-config__tab report-config__tab--active" type="button">全部模板</button>
                <button className="report-config__tab" type="button">待发布</button>
                <button className="report-config__tab" type="button">有风险</button>
              </div>
              <Input.Search
                allowClear
                className="report-config__search"
                  placeholder="搜索报表、规则、科目"
              />
              <div className="avatar-stack" aria-label="协作成员">
                <span>陈</span>
                <span>陆</span>
                <span>+3</span>
              </div>
              <div className="report-config__actions">
                <Button icon={<SaveOutlined />} onClick={handleSaveDraft}>
                  保存草稿
                </Button>
                <Button icon={<CloudDownloadOutlined />} onClick={handleExport}>
                  导出模板包
                </Button>
                <Button
                  icon={<CheckCircleOutlined />}
                  loading={publishing}
                  onClick={handlePublish}
                  type="primary"
                >
                  发布配置
                </Button>
              </div>
            </div>
          </header>

        {pageMode === 'overview' ? (
          <>
        <Row gutter={[14, 14]} className="report-config__metrics">
          {metrics.map((metric) => (
            <Col xs={24} sm={12} lg={6} key={metric.label}>
              <section className="report-metric">
                <span className="report-metric__icon">{metric.icon}</span>
                <div>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                  <small>{metric.hint}</small>
                </div>
              </section>
            </Col>
          ))}
        </Row>

        <section className="report-config__workspace">
          <aside className="standard-ledger" aria-label="会计准则列表">
            <div className="standard-ledger__head">
              <span>准则账册</span>
              <Tag color="blue">{standards.length} 套</Tag>
            </div>
            <div className="standard-ledger__list">
              {standards.map((standard) => {
                const selected = standard.id === currentStandard?.id;
                const activeReports = standard.reports.filter((report) => report.enabled).length;
                return (
                  <button
                    key={standard.id}
                    className={`standard-card${selected ? ' standard-card--selected' : ''}`}
                    type="button"
                    onClick={() => handleStandardChange(standard.id)}
                  >
                    <span className="standard-card__code">{standard.shortName}</span>
                    <strong>{standard.name}</strong>
                    <small>{standard.version}</small>
                    <span className="standard-card__desc">{standard.description}</span>
                    <span className="standard-card__meta">
                      <span>{activeReports} 份报表</span>
                      <span>{standard.pendingChanges} 项变更</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="config-stage">
            <div className="config-stage__title">
              <div>
                <Text type="secondary">当前配置范围</Text>
                <h2>{currentStandard?.name}</h2>
              </div>
              <Space wrap size={8}>
                <Tag color="blue">{currentStandard?.version}</Tag>
                <Tag color={(currentStandard?.pendingChanges ?? 0) > 0 ? 'gold' : 'green'}>
                  {(currentStandard?.pendingChanges ?? 0) > 0 ? '有待发布变更' : '已同步'}
                </Tag>
              </Space>
            </div>

            <Tabs
              className="config-stage__tabs"
              items={[
                {
                  key: 'matrix',
                  label: '报表矩阵',
                  children: (
                    <div className="matrix-panel">
                      <Table
                        columns={reportColumns}
                        dataSource={currentStandard?.reports ?? []}
                        pagination={false}
                        rowClassName={(record: ReportConfig) => (
                          record.id === currentReport?.id ? 'report-table-row--selected' : ''
                        )}
                        rowKey="id"
                        scroll={{ x: 860 }}
                        size="middle"
                      />
                    </div>
                  )
                },
                {
                  key: 'rules',
                  label: '规则编排',
                  children: (
                    <div className="rule-board">
                      {currentStandard?.ruleGroups.map((group) => (
                        <section className="rule-group" key={group.id}>
                          <div className="rule-group__head">
                            <div>
                              <span>{group.scope}</span>
                              <h3>{group.name}</h3>
                              <p>{group.description}</p>
                            </div>
                            <Tag>{group.rules.length} 条</Tag>
                          </div>
                          <div className="rule-group__items">
                            {group.rules.map((rule) => {
                              const meta = severityMeta(rule.severity);
                              return (
                                <div className={`rule-item${rule.enabled ? '' : ' rule-item--off'}`} key={rule.id}>
                                  <div className="rule-item__main">
                                    <Space wrap size={8}>
                                      <Tag color={meta.color}>{meta.label}</Tag>
                                      <Tag color="default">P{rule.priority}</Tag>
                                    </Space>
                                    <strong>{rule.name}</strong>
                                    <p>{rule.condition}</p>
                                    <span>{rule.action}</span>
                                  </div>
                                  <Switch
                                    checked={rule.enabled}
                                    checkedChildren="启用"
                                    unCheckedChildren="停用"
                                    onChange={() => handleRuleToggle(rule.id)}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </section>
                      ))}
                    </div>
                  )
                },
                {
                  key: 'preview',
                  label: '校验预览',
                  children: (
                    <div className="preview-panel">
                      <section className="preview-score">
                        <div>
                          <Text type="secondary">发布就绪度</Text>
                          <strong>{previewWarnings.length === 0 ? '96%' : '82%'}</strong>
                          <span>样例期间：2026 年 5 月，试算主体：{tenantName}</span>
                        </div>
                        <Progress
                          percent={previewWarnings.length === 0 ? 96 : 82}
                          showInfo={false}
                          strokeColor={previewWarnings.length === 0 ? '#047857' : '#b7791f'}
                        />
                      </section>
                      <section className="preview-checks">
                        <div>
                          <CheckCircleOutlined />
                          <span>报表字段完整性通过</span>
                        </div>
                        <div>
                          <CheckCircleOutlined />
                          <span>科目映射覆盖率 98.4%</span>
                        </div>
                        {previewWarnings.length === 0 ? (
                          <div>
                            <CheckCircleOutlined />
                            <span>无阻断级风险，可直接发布</span>
                          </div>
                        ) : (
                          previewWarnings.map((warning) => (
                            <div className="preview-checks__warning" key={warning}>
                              <WarningOutlined />
                              <span>{warning}</span>
                            </div>
                          ))
                        )}
                      </section>
                    </div>
                  )
                }
              ]}
            />
          </section>

          <aside className="report-inspector" aria-label="当前报表配置">
            {currentReport ? (
              <>
                <div className="report-inspector__head">
                  <span>真实报表预览</span>
                  <Tag color={statusMeta(currentReport.status).color}>{statusMeta(currentReport.status).label}</Tag>
                </div>
                {currentPreview ? (
                  <div className="report-paper">
                    <div className="report-paper__title">
                      <h2>{currentPreview.title}</h2>
                      <p>{currentReport.basis}</p>
                    </div>
                    <div className="report-paper__meta">
                      <span>编制单位：{tenantName}</span>
                      <span>期间：2026 年 5 月</span>
                      <span>{currentPreview.unit}</span>
                    </div>

                    {currentPreview.layout === 'paired' ? (
                      <div className="report-paper__scroll">
                        <table className="financial-table financial-table--paired">
                          <thead>
                            <tr>
                              <th>{currentPreview.leftTitle}</th>
                              <th>行次</th>
                              <th>期末余额</th>
                              <th>上年年末余额</th>
                              <th>{currentPreview.rightTitle}</th>
                              <th>行次</th>
                              <th>期末余额</th>
                              <th>上年年末余额</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Array.from({
                              length: Math.max(currentPreview.leftRows.length, currentPreview.rightRows.length)
                            }).map((_, index) => {
                              const left = currentPreview.leftRows[index] ?? ['', '', '', ''];
                              const right = currentPreview.rightRows[index] ?? ['', '', '', ''];
                              const totalRow = left[0]?.includes('合计') || left[0]?.includes('总计')
                                || right[0]?.includes('合计') || right[0]?.includes('总计')
                                || left[0]?.includes('Total') || right[0]?.includes('Total');
                              const sectionRow = (!left[1] && !left[2]) || (!right[1] && !right[2]);
                              return (
                                <tr
                                  className={`${sectionRow ? 'financial-table__section' : ''}${totalRow ? ' financial-table__total' : ''}`}
                                  key={`${left[0]}-${right[0]}-${index}`}
                                >
                                  {[
                                    left[0],
                                    left[1],
                                    left[1] ? '按所选科目余额取值' : '',
                                    left[1] ? '取上年期末余额' : '',
                                    right[0],
                                    right[1],
                                    right[1] ? '按所选科目余额取值' : '',
                                    right[1] ? '取上年期末余额' : ''
                                  ].map((cell, cellIndex) => (
                                    <td key={`${cell}-${cellIndex}`}>{cell}</td>
                                  ))}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="report-paper__scroll">
                        <table className="financial-table">
                          <thead>
                            <tr>
                              {currentPreview.columns.slice(0, 4).map((column) => (
                                <th key={column}>{column}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {currentPreview.rows.map((row, index) => (
                              <tr
                                className={`${row.type === 'section' ? 'financial-table__section' : ''}${row.type === 'total' ? ' financial-table__total' : ''}`}
                                key={`${row.cells[0]}-${index}`}
                              >
                                {[
                                  row.cells[0],
                                  row.cells[1] ?? '',
                                  row.type === 'section' ? '' : '按行项目规则取值',
                                  row.type === 'section' ? '' : '按系统固定列规则取值'
                                ].map((cell, cellIndex) => (
                                  <td key={`${cell}-${cellIndex}`}>{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : null}

                <Divider />

                <dl className="report-inspector__facts">
                  <div>
                    <dt>报表编码</dt>
                    <dd>{currentReport.code}</dd>
                  </div>
                  <div>
                    <dt>报送周期</dt>
                    <dd>{currentReport.period}</dd>
                  </div>
                  <div>
                    <dt>截止时间</dt>
                    <dd>{currentReport.deadline}</dd>
                  </div>
                  <div>
                    <dt>责任团队</dt>
                    <dd>{currentReport.owner}</dd>
                  </div>
                </dl>

                <Divider />

                <div className="field-list">
                  <span className="field-list__title">必填字段</span>
                  {currentReport.requiredFields.map((field) => (
                    <span className="field-chip" key={field}>
                      {field}
                    </span>
                  ))}
                </div>

                <div className="rule-link-card">
                  <PartitionOutlined />
                  <div>
                    <strong>{currentReport.linkedRules} 条关联规则</strong>
                    <span>包含取数映射、勾稽校验与披露控制</span>
                  </div>
                </div>

                <div className="inspector-actions">
                  <Button block icon={<SwapOutlined />} onClick={() => handleReportToggle(currentReport.id)}>
                    {currentReport.enabled ? '停用该报表' : '启用该报表'}
                  </Button>
                  <Button block icon={<SlidersOutlined />} type="primary" onClick={() => handleOpenReportDetail(currentReport)}>
                    打开高级配置
                  </Button>
                </div>
              </>
            ) : (
              <Empty description="暂无报表配置" />
            )}
          </aside>
        </section>
          </>
        ) : (
          <section className="detail-page">
            <div className="detail-toolbar">
              <Button icon={<ArrowLeftOutlined />} onClick={() => setPageMode('overview')}>
                返回配置总览
              </Button>
              <div className="detail-toolbar__title">
                <Text type="secondary">页面 2 / 表样配置详情</Text>
                <h2>{currentStandard?.name} · {currentReport?.name}</h2>
              </div>
              <div className="detail-toolbar__actions">
                <Button icon={<PlusOutlined />} onClick={handleAddEditableRow}>
                  新增行
                </Button>
                <Button danger icon={<DeleteOutlined />} onClick={handleDeleteEditableRow}>
                  删除行
                </Button>
                <Button icon={<SaveOutlined />} onClick={handleDetailDraft}>
                  保存表样
                </Button>
                <Button type="primary" icon={<CheckCircleOutlined />} loading={publishing} onClick={handlePublish}>
                  发布配置
                </Button>
              </div>
            </div>

            <div className="detail-grid">
              <section className="report-editor-paper">
                  <div className="report-paper report-paper--editor">
                    <div className="report-paper__title">
                      <h2>{currentReport?.name ?? '资产负债表'}</h2>
                    <p>按真实报表表样配置项目行规则。金额列由系统固定取数逻辑生成，本页只维护报表项目行。</p>
                    </div>
                  <div className="report-paper__meta">
                    <span>编制单位：{tenantName}</span>
                    <span>期间：2026 年 5 月</span>
                    <span>单位：元</span>
                  </div>

                  <div className="report-paper__scroll">
                    {detailIsProfitReport ? (
                      <table className="financial-table financial-table--editable">
                        <thead>
                          <tr>
                            <th>项目</th>
                            <th>行次</th>
                            <th>本期金额</th>
                            <th>上期金额</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editableRows.map((row) => (
                            <tr
                              className={row.rowType === 'total' ? 'financial-table__total' : ''}
                              key={row.id}
                            >
                              {[row.item, row.lineNo, getProjectValueRange(row), getProjectValueRange(row)].map((cell, cellIndex) => (
                                <td
                                  className={row.id === selectedEditableRowId ? 'financial-table__selected-cell' : ''}
                                  key={`${row.id}-${cellIndex}`}
                                  onClick={() => setSelectedEditableRowId(row.id)}
                                >
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <table className="financial-table financial-table--paired financial-table--editable">
                        <thead>
                          <tr>
                            <th>资产</th>
                            <th>行次</th>
                            <th>期末余额</th>
                            <th>上年年末余额</th>
                            <th>负债和所有者权益</th>
                            <th>行次</th>
                            <th>期末余额</th>
                            <th>上年年末余额</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editableRowPairs.map((pair, index) => {
                            const cells = [
                              { row: pair.asset, value: pair.asset?.item },
                              { row: pair.asset, value: pair.asset?.lineNo },
                              { row: pair.asset, value: getProjectValueRange(pair.asset) },
                              { row: pair.asset, value: getProjectValueRange(pair.asset) },
                              { row: pair.liability, value: pair.liability?.item },
                              { row: pair.liability, value: pair.liability?.lineNo },
                              { row: pair.liability, value: getProjectValueRange(pair.liability) },
                              { row: pair.liability, value: getProjectValueRange(pair.liability) }
                            ];
                            const rowType = pair.asset?.rowType === 'total' || pair.liability?.rowType === 'total'
                              ? 'total'
                              : pair.asset?.rowType === 'section' || pair.liability?.rowType === 'section'
                                ? 'section'
                                : undefined;
                            return (
                              <tr
                                className={`${rowType === 'section' ? 'financial-table__section' : ''}${rowType === 'total' ? ' financial-table__total' : ''}`}
                                key={`${pair.asset?.id ?? 'asset'}-${pair.liability?.id ?? 'liability'}-${index}`}
                              >
                                {cells.map((cell, cellIndex) => (
                                  <td
                                    className={cell.row?.id === selectedEditableRowId ? 'financial-table__selected-cell' : ''}
                                    key={`${cell.row?.id ?? 'empty'}-${cellIndex}`}
                                    onClick={() => cell.row && setSelectedEditableRowId(cell.row.id)}
                                  >
                                    {cell.value ?? ''}
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                <div className="row-rule-strip">
                  <span>当前选中</span>
                  <strong>{selectedEditableRow?.item}</strong>
                  <em>{selectedEditableRow?.ruleType} · {selectedEditableRow?.source}</em>
                  <p>{buildFormulaPreview(selectedEditableRow)}</p>
                </div>
              </section>

              <aside className="row-editor-panel">
                <div className="row-editor-panel__head">
                  <span>行项目配置</span>
                  <Switch
                    checked={selectedEditableRow?.enabled}
                    checkedChildren="启用"
                    unCheckedChildren="停用"
                    onChange={(enabled) => updateEditableRow({ enabled })}
                  />
                </div>

                {selectedEditableRow ? (
                  <Form layout="vertical" className="row-editor-form">
                    <Form.Item label="项目名称">
                      <Input
                        value={selectedEditableRow.item}
                        onChange={(event) => updateEditableRow({ item: event.target.value })}
                      />
                    </Form.Item>
                    <div className="row-editor-form__pair">
                      <Form.Item label="报表区域">
                        <Select
                          value={selectedEditableRow.side}
                          onChange={(side) => updateEditableRow({ side })}
                          options={[
                            { label: '资产侧', value: 'asset' },
                            { label: '负债和权益侧', value: 'liability' }
                          ]}
                        />
                      </Form.Item>
                      <Form.Item label="行次">
                        <Input
                          value={selectedEditableRow.lineNo}
                          onChange={(event) => updateEditableRow({ lineNo: event.target.value })}
                        />
                      </Form.Item>
                    </div>
                    <Form.Item label="科目取值规则">
                      {selectedEditableRow.rowType === 'section' || selectedEditableRow.rowType === 'total' ? (
                        <div className="subject-rule-empty">
                          {selectedEditableRow.rowType === 'section' ? '分组标题不参与取数。' : selectedEditableRow.ruleExpression}
                        </div>
                      ) : (
                        <div className="subject-rule-table">
                          <div className="subject-rule-table__head">
                            <span>科目名称</span>
                            <span>运算符</span>
                            <span>取值规则</span>
                            <span>操作</span>
                          </div>
                          {getSubjectRules(selectedEditableRow).map((line) => (
                            <div className="subject-rule-table__row" key={line.id}>
                              <Select
                                showSearch
                                value={line.subject}
                                onChange={(subject) => updateSubjectRuleLine(line.id, { subject })}
                                options={SUBJECT_OPTIONS}
                                optionFilterProp="label"
                              />
                              <Select
                                value={line.operator}
                                onChange={(operator) => updateSubjectRuleLine(line.id, { operator })}
                                options={[
                                  { label: '+', value: '+' },
                                  { label: '-', value: '-' }
                                ]}
                              />
                              <Select
                                value={line.valueRule}
                                onChange={(valueRule) => updateSubjectRuleLine(line.id, { valueRule })}
                                options={[
                                  { label: '余额', value: '余额' },
                                  { label: '借方余额', value: '借方余额' },
                                  { label: '贷方余额', value: '贷方余额' },
                                  { label: '发生额', value: '发生额' },
                                  { label: '借方发生额', value: '借方发生额' },
                                  { label: '贷方发生额', value: '贷方发生额' }
                                ]}
                              />
                              <Button
                                aria-label="删除科目规则"
                                disabled={getSubjectRules(selectedEditableRow).length <= 1}
                                icon={<DeleteOutlined />}
                                onClick={() => handleDeleteSubjectRuleLine(line.id)}
                              />
                            </div>
                          ))}
                          <div className="subject-rule-table__summary">
                            <strong>合计</strong>
                            <span>{buildFormulaPreview(selectedEditableRow)}</span>
                          </div>
                          <Button block icon={<PlusOutlined />} onClick={handleAddSubjectRuleLine}>
                            新增科目
                          </Button>
                        </div>
                      )}
                    </Form.Item>
                    <Form.Item label="取值范围">
                      <Select
                        value={selectedEditableRow.valueRange || '余额'}
                        onChange={(valueRange) => updateEditableRow({ valueRange })}
                        options={VALUE_RANGE_OPTIONS}
                      />
                    </Form.Item>
                    <Form.Item label="行类型">
                      <Select
                        value={selectedEditableRow.rowType ?? 'normal'}
                        onChange={(rowType) => updateEditableRow({
                          rowType: rowType === 'section' || rowType === 'total' ? rowType : undefined
                        })}
                        options={[
                          { label: '普通项目行', value: 'normal' },
                          { label: '分组标题行', value: 'section' },
                          { label: '合计校验行', value: 'total' }
                        ]}
                      />
                    </Form.Item>
                    <Form.Item label="取值规则类型">
                      <Select
                        value={selectedEditableRow.ruleType}
                        onChange={(ruleType) => updateEditableRow({ ruleType })}
                        options={[
                          { label: '科目余额', value: '科目余额' },
                          { label: '科目汇总', value: '科目汇总' },
                          { label: '重分类', value: '重分类' },
                          { label: '表内公式', value: '表内公式' },
                          { label: '分组标题', value: '分组标题' }
                        ]}
                      />
                    </Form.Item>
                    <Form.Item label="取值规则">
                      <Input.TextArea
                        autoSize={{ minRows: 4, maxRows: 7 }}
                        value={selectedEditableRow.ruleExpression}
                        onChange={(event) => updateEditableRow({ ruleExpression: event.target.value })}
                      />
                    </Form.Item>
                    <Form.Item label="数据来源">
                      <Select
                        value={selectedEditableRow.source}
                        onChange={(source) => updateEditableRow({ source })}
                        options={[
                          { label: '总账余额表', value: '总账余额表' },
                          { label: '总账发生额表', value: '总账发生额表' },
                          { label: '往来辅助余额', value: '往来辅助余额' },
                          { label: '固定资产卡片', value: '固定资产卡片' },
                          { label: '存货明细账', value: '存货明细账' },
                          { label: '利润分配明细账', value: '利润分配明细账' },
                          { label: '报表公式', value: '报表公式' },
                          { label: '-', value: '-' }
                        ]}
                      />
                    </Form.Item>
                  </Form>
                ) : (
                  <Empty description="请选择报表行" />
                )}

                <div className="detail-check-card">
                  <CheckCircleOutlined />
                  <div>
                    <strong>表内校验</strong>
                    <span>
                      {detailIsProfitReport
                        ? '营业利润、利润总额和净利润已绑定表内公式，发布前自动检查循环引用。'
                        : '资产总计与负债和所有者权益总计已绑定一致性校验，发布前自动检查。'}
                    </span>
                  </div>
                </div>
              </aside>
            </div>
          </section>
        )}

        <Modal
          centered
          confirmLoading={publishing}
          okText="确认发布"
          open={publishModalOpen}
          title="发布前校验"
          onCancel={() => setPublishModalOpen(false)}
          onOk={handleConfirmPublish}
        >
          <div className="publish-check-modal">
            <p className="publish-check-modal__summary">
              本次发布仅更新后台初始模板，影响未来新建客户账套；已有客户账套及客户自定义规则不受影响。
            </p>
            <div className="publish-check-item publish-check-item--success">
              <CheckCircleOutlined />
              <div>
                <strong>报表平衡校验通过</strong>
                <span>资产总计 = 负债和所有者权益总计；利润表表内合计公式已建立。</span>
              </div>
            </div>
            <div className="publish-check-item publish-check-item--success">
              <CheckCircleOutlined />
              <div>
                <strong>科目漏绑校验通过</strong>
                <span>普通项目行已绑定至少一个科目；分组标题和合计行不参与科目绑定检查。</span>
              </div>
            </div>
            <div className="publish-check-item publish-check-item--warning">
              <WarningOutlined />
              <div>
                <strong>影响范围确认</strong>
                <span>发布后新建账套会带入当前准则下 {enabledReportCount} 份已启用报表模板。</span>
              </div>
            </div>
            <div className="publish-check-item publish-check-item--success">
              <CheckCircleOutlined />
              <div>
                <strong>重复科目与公式检查完成</strong>
                <span>同一报表项目内未发现重复科目，表内公式未发现循环引用。</span>
              </div>
            </div>
          </div>
        </Modal>
        </div>
      </main>
    </ConfigProvider>
  );
});

export default Component;
