/**
 * @name 账套导入系统原型
 * @mode axure
 *
 * 参考资料：
 * - /rules/design-guide.md
 * - /rules/development-guide.md
 * - /Users/caoyi/.agents/skills/服务商设计规范/SKILL.md
 */

import './style.css';

import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Divider,
  Form,
  Input,
  Modal,
  Progress,
  Radio,
  Select,
  Space,
  Steps,
  Tag,
  Timeline,
  message
} from 'antd';
import {
  ApiOutlined,
  AuditOutlined,
  BankOutlined,
  CheckCircleOutlined,
  CloudDownloadOutlined,
  FileProtectOutlined,
  FileSearchOutlined,
  ImportOutlined,
  LockOutlined,
  LoginOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SwapOutlined,
  UserOutlined
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

type Software = '猪哥云' | '财税合规AI服务系统';
type ItemStatus = 'ready' | 'warning' | 'blocked' | 'imported';
type WorkMode = 'login' | 'tasks' | 'sourceAuth' | 'collecting' | 'targetAuth' | 'selectImport' | 'importing' | 'done';
type ImportMode = 'skipExisting' | 'overwriteExisting';

type LedgerSet = {
  id: string;
  software: Software;
  merchant: string;
  name: string;
  company: string;
  period: string;
  standard: string;
  voucherCount: number;
};

type LedgerItem = {
  id: string;
  ledgerSetId: string;
  category: string;
  name: string;
  period: string;
  count: number;
  amount: number;
  status: ItemStatus;
  issues: string[];
};

type ImportRecord = {
  id: string;
  sourceSoftware: Software;
  targetSoftware: Software;
  sourceMerchant: string;
  targetMerchant: string;
  sourceSet: string;
  targetSet: string;
  itemCount: number;
  recordCount: number;
  status: string;
  time: string;
};

const SOFTWARES: Software[] = ['猪哥云', '财税合规AI服务系统'];

const DEFAULT_LEDGER_SETS: LedgerSet[] = [
  {
    id: 'zg-sh-2026',
    software: '猪哥云',
    merchant: '华东服务商-上海一部',
    name: '上海云衡科技有限公司 2026 账套',
    company: '上海云衡科技有限公司',
    period: '2026-01 至 2026-05',
    standard: '小企业会计准则',
    voucherCount: 4268
  },
  {
    id: 'zg-hz-2025',
    software: '猪哥云',
    merchant: '华东服务商-杭州二部',
    name: '杭州青舟供应链有限公司 2025 账套',
    company: '杭州青舟供应链有限公司',
    period: '2025-01 至 2025-12',
    standard: '企业会计准则',
    voucherCount: 8912
  },
  {
    id: 'ai-sh-2026',
    software: '财税合规AI服务系统',
    merchant: '合规AI直营-上海',
    name: '上海云衡科技有限公司 合规账套',
    company: '上海云衡科技有限公司',
    period: '2026-01 至 2026-05',
    standard: '小企业会计准则',
    voucherCount: 4196
  },
  {
    id: 'ai-sz-2026',
    software: '财税合规AI服务系统',
    merchant: '合规AI直营-深圳',
    name: '深圳明策咨询合伙企业 合规账套',
    company: '深圳明策咨询合伙企业',
    period: '2026-01 至 2026-05',
    standard: '企业会计准则',
    voucherCount: 2630
  }
];

const DEFAULT_LEDGER_ITEMS: LedgerItem[] = [
  {
    id: 'FIN-001',
    ledgerSetId: 'zg-sh-2026',
    category: '财务数据',
    name: '财务初始余额',
    period: '全部期间',
    count: 186,
    amount: 12869340.78,
    status: 'ready',
    issues: []
  },
  {
    id: 'FIN-002',
    ledgerSetId: 'zg-sh-2026',
    category: '财务数据',
    name: '会计科目',
    period: '全部期间',
    count: 312,
    amount: 0,
    status: 'ready',
    issues: []
  },
  {
    id: 'FIN-003',
    ledgerSetId: 'zg-sh-2026',
    category: '财务数据',
    name: '凭证记录',
    period: '2026-01 至 2026-05',
    count: 4268,
    amount: 52983688.15,
    status: 'ready',
    issues: []
  },
  {
    id: 'FIN-004',
    ledgerSetId: 'zg-sh-2026',
    category: '财务数据',
    name: '辅助核算',
    period: '全部期间',
    count: 94,
    amount: 0,
    status: 'ready',
    issues: []
  },
  {
    id: 'BASE-001',
    ledgerSetId: 'zg-sh-2026',
    category: '基础资料',
    name: '财务初始余额',
    period: '全部期间',
    count: 186,
    amount: 12869340.78,
    status: 'ready',
    issues: []
  },
  {
    id: 'BASE-002',
    ledgerSetId: 'zg-sh-2026',
    category: '基础资料',
    name: '银行账户',
    period: '全部期间',
    count: 12,
    amount: 0,
    status: 'ready',
    issues: []
  },
  {
    id: 'BASE-003',
    ledgerSetId: 'zg-sh-2026',
    category: '基础资料',
    name: '科目',
    period: '全部期间',
    count: 312,
    amount: 0,
    status: 'ready',
    issues: []
  },
  {
    id: 'BASE-004',
    ledgerSetId: 'zg-sh-2026',
    category: '基础资料',
    name: '辅助核算',
    period: '全部期间',
    count: 94,
    amount: 0,
    status: 'ready',
    issues: []
  },
  {
    id: 'SMART-001',
    ledgerSetId: 'zg-sh-2026',
    category: '智能记账',
    name: '销项发票',
    period: '2026-01 至 2026-05',
    count: 1098,
    amount: 16883000.25,
    status: 'ready',
    issues: []
  },
  {
    id: 'SMART-002',
    ledgerSetId: 'zg-sh-2026',
    category: '智能记账',
    name: '进项发票',
    period: '2026-01 至 2026-05',
    count: 1098,
    amount: 6805120.21,
    status: 'ready',
    issues: []
  },
  {
    id: 'SMART-003',
    ledgerSetId: 'zg-sh-2026',
    category: '智能记账',
    name: '费用报销',
    period: '2026-01 至 2026-05',
    count: 486,
    amount: 2879310.4,
    status: 'ready',
    issues: []
  },
  {
    id: 'SMART-004',
    ledgerSetId: 'zg-sh-2026',
    category: '智能记账',
    name: '无票收入',
    period: '2026-01 至 2026-05',
    count: 72,
    amount: 1296000,
    status: 'ready',
    issues: []
  },
  {
    id: 'SMART-005',
    ledgerSetId: 'zg-sh-2026',
    category: '智能记账',
    name: '银行',
    period: '2026-01 至 2026-05',
    count: 2230,
    amount: 31822900.62,
    status: 'ready',
    issues: []
  },
  {
    id: 'SMART-006',
    ledgerSetId: 'zg-sh-2026',
    category: '智能记账',
    name: '工资',
    period: '2026-01 至 2026-05',
    count: 486,
    amount: 2879310.4,
    status: 'ready',
    issues: []
  },
  {
    id: 'OTHER-001',
    ledgerSetId: 'zg-sh-2026',
    category: '其他',
    name: '币别',
    period: '全部期间',
    count: 3,
    amount: 0,
    status: 'ready',
    issues: []
  },
  {
    id: 'OTHER-002',
    ledgerSetId: 'zg-sh-2026',
    category: '其他',
    name: '附件',
    period: '2026-01 至 2026-05',
    count: 1680,
    amount: 0,
    status: 'ready',
    issues: []
  },
  {
    id: 'OTHER-003',
    ledgerSetId: 'zg-sh-2026',
    category: '其他',
    name: '小计',
    period: '全部期间',
    count: 1,
    amount: 0,
    status: 'ready',
    issues: []
  }
];

const DEFAULT_RECORDS: ImportRecord[] = [
  {
    id: 'TASK-20260609-003',
    sourceSoftware: '猪哥云',
    targetSoftware: '财税合规AI服务系统',
    sourceMerchant: '华东服务商-上海一部',
    targetMerchant: '合规AI直营-上海',
    sourceSet: '上海云衡科技有限公司 2026 账套',
    targetSet: '按企业自动匹配',
    itemCount: 17,
    recordCount: 14382,
    status: '待导入',
    time: '2026-06-09 09:18'
  },
  {
    id: 'TASK-20260609-002',
    sourceSoftware: '财税合规AI服务系统',
    targetSoftware: '猪哥云',
    sourceMerchant: '合规AI直营-深圳',
    targetMerchant: '华南服务商-深圳一部',
    sourceSet: '深圳明策咨询合伙企业 合规账套',
    targetSet: '按企业自动匹配',
    itemCount: 11,
    recordCount: 6724,
    status: '采集中',
    time: '2026-06-09 08:42'
  },
  {
    id: 'IMP-20260608-001',
    sourceSoftware: '猪哥云',
    targetSoftware: '财税合规AI服务系统',
    sourceMerchant: '华东服务商-上海一部',
    targetMerchant: '合规AI直营-上海',
    sourceSet: '上海云衡科技有限公司 2026 账套',
    targetSet: '上海云衡科技有限公司 合规账套',
    itemCount: 6,
    recordCount: 9096,
    status: '导入成功',
    time: '2026-06-08 14:36'
  }
];

const EVENT_LIST: EventItem[] = [
  { name: 'on_login_submit', desc: '提交导账系统登录时触发', payload: '登录账号 JSON 字符串' },
  { name: 'on_source_collect_submit', desc: '提交源财务软件采集授权时触发', payload: '源软件、商户/服务商和账号 JSON 字符串' },
  { name: 'on_collect_finish', desc: '异步采集任务完成时触发', payload: '采集到账套和数据 JSON 字符串' },
  { name: 'on_target_auth_submit', desc: '提交目标财务软件授权时触发', payload: '目标软件、商户/服务商和账号 JSON 字符串' },
  { name: 'on_selection_change', desc: '选择导入方式或导入数据时触发', payload: '当前选择 JSON 字符串' },
  { name: 'on_import_start', desc: '开始导入时触发', payload: '导入任务 JSON 字符串' },
  { name: 'on_import_success', desc: '导入成功并生成记录时触发', payload: '导入记录 JSON 字符串' }
];

const ACTION_LIST: Action[] = [
  { name: 'submit_login', desc: '进入导账任务列表' },
  { name: 'start_new_task', desc: '从任务列表发起新的导账任务' },
  { name: 'submit_source_collect', desc: '提交源软件授权并创建异步采集任务' },
  { name: 'finish_collect', desc: '直接进入目标财务软件授权' },
  { name: 'submit_target_auth', desc: '提交目标软件授权并进入导入选择' },
  { name: 'import_selected', desc: '导入当前选择的数据' },
  { name: 'reset_flow', desc: '新建采集任务' }
];

const VAR_LIST: KeyDesc[] = [
  { name: 'current_mode', desc: '当前页面状态' },
  { name: 'source_software', desc: '源财务软件' },
  { name: 'target_software', desc: '目标财务软件' },
  { name: 'source_merchant', desc: '源财务软件下商户/服务商' },
  { name: 'target_merchant', desc: '目标财务软件下商户/服务商' },
  { name: 'import_mode', desc: '导入方式：跳过或覆盖已创建账套企业' },
  { name: 'selected_items', desc: '待导入数据项' },
  { name: 'import_records', desc: '导入记录列表' }
];

const CONFIG_LIST: ConfigItem[] = [
  { type: 'input', attributeId: 'title', displayName: '页面标题', initialValue: '账套导入系统' },
  { type: 'input', attributeId: 'subtitle', displayName: '页面说明', initialValue: '采集源财务软件账套数据，并导入到新的财务软件账套' }
];

const DATA_LIST: DataDesc[] = [
  {
    name: 'ledger_sets',
    desc: '采集到账套列表',
    keys: [
      { name: 'id', desc: '账套唯一标识' },
      { name: 'software', desc: '所属财务软件' },
      { name: 'merchant', desc: '商户/服务商' },
      { name: 'name', desc: '账套名称' },
      { name: 'company', desc: '企业名称' },
      { name: 'period', desc: '账套期间' },
      { name: 'standard', desc: '会计准则' },
      { name: 'voucherCount', desc: '凭证数量' }
    ]
  },
  {
    name: 'ledger_items',
    desc: '采集到的数据项',
    keys: [
      { name: 'id', desc: '数据项唯一标识' },
      { name: 'ledgerSetId', desc: '所属账套 id' },
      { name: 'category', desc: '数据分类' },
      { name: 'name', desc: '数据名称' },
      { name: 'period', desc: '期间' },
      { name: 'count', desc: '记录数量' },
      { name: 'amount', desc: '金额合计' },
      { name: 'status', desc: 'ready / warning / blocked / imported' },
      { name: 'issues', desc: '异常说明' }
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

function oppositeSoftware(software: Software): Software {
  return software === '猪哥云' ? '财税合规AI服务系统' : '猪哥云';
}

function toMoney(value: number) {
  if (!value) return '-';
  return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusMeta(status: ItemStatus) {
  if (status === 'ready') return { label: '可导入', className: 'ledger-tag ledger-tag--success' };
  if (status === 'warning') return { label: '需确认', className: 'ledger-tag ledger-tag--warning' };
  if (status === 'imported') return { label: '已导入', className: 'ledger-tag ledger-tag--info' };
  return { label: '暂不可导', className: 'ledger-tag ledger-tag--failed' };
}

function stepIndex(mode: WorkMode) {
  if (mode === 'login' || mode === 'tasks') return 0;
  if (mode === 'sourceAuth' || mode === 'collecting') return 1;
  if (mode === 'targetAuth') return 2;
  if (mode === 'selectImport') return 3;
  if (mode === 'importing') return 4;
  return 5;
}

const Component = forwardRef<AxureHandle, AxureProps>(function LedgerMigration(innerProps, ref) {
  const dataSource = innerProps?.data ?? {};
  const configSource = innerProps?.config ?? {};
  const onEventHandler = typeof innerProps?.onEvent === 'function' ? innerProps.onEvent : undefined;

  const ledgerSets = useMemo<LedgerSet[]>(() => (
    Array.isArray(dataSource.ledger_sets) && dataSource.ledger_sets.length > 0 ? dataSource.ledger_sets : DEFAULT_LEDGER_SETS
  ), [dataSource.ledger_sets]);

  const initialItems = useMemo<LedgerItem[]>(() => (
    Array.isArray(dataSource.ledger_items) && dataSource.ledger_items.length > 0 ? dataSource.ledger_items : DEFAULT_LEDGER_ITEMS
  ), [dataSource.ledger_items]);

  const title = String(configSource.title ?? '账套导入系统');
  const subtitle = String(configSource.subtitle ?? '采集源财务软件账套数据，并导入到新的财务软件账套');

  const [loginForm] = Form.useForm();
  const [sourceForm] = Form.useForm();
  const [targetForm] = Form.useForm();
  const [mode, setMode] = useState<WorkMode>('login');
  const [sourceSoftware, setSourceSoftware] = useState<Software>('猪哥云');
  const [targetSoftware, setTargetSoftware] = useState<Software>('财税合规AI服务系统');
  const [sourceMerchant, setSourceMerchant] = useState('华东服务商-上海一部');
  const [targetMerchant, setTargetMerchant] = useState('合规AI直营-上海');
  const [selectedSourceSetId, setSelectedSourceSetId] = useState('zg-sh-2026');
  const [selectedTargetSetId, setSelectedTargetSetId] = useState('ai-sh-2026');
  const [importMode, setImportMode] = useState<ImportMode>('skipExisting');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>(DEFAULT_LEDGER_ITEMS.map((item) => item.id));
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [records, setRecords] = useState<ImportRecord[]>(DEFAULT_RECORDS);
  const [importedIds, setImportedIds] = useState<string[]>([]);
  const [lastImportedCount, setLastImportedCount] = useState(0);

  const emitEvent = useCallback((eventName: string, payload: unknown) => {
    try {
      onEventHandler?.(eventName, safePayload(payload));
    } catch (error) {
      console.warn('onEvent 调用失败:', error);
    }
  }, [onEventHandler]);

  const collectedLedgerSets = useMemo(() => (
    ledgerSets.filter((item) => item.software === sourceSoftware)
  ), [ledgerSets, sourceSoftware]);

  const targetLedgerSets = useMemo(() => (
    ledgerSets.filter((item) => item.software === targetSoftware)
  ), [ledgerSets, targetSoftware]);

  const selectedSourceSet = useMemo(() => (
    ledgerSets.find((item) => item.id === selectedSourceSetId) ?? collectedLedgerSets[0]
  ), [collectedLedgerSets, ledgerSets, selectedSourceSetId]);

  const selectedTargetSet = useMemo(() => (
    ledgerSets.find((item) => item.id === selectedTargetSetId) ?? targetLedgerSets[0]
  ), [ledgerSets, selectedTargetSetId, targetLedgerSets]);

  const currentItems = useMemo(() => (
    initialItems
      .filter((item) => item.ledgerSetId === selectedSourceSet?.id)
      .map((item) => importedIds.includes(item.id) ? { ...item, status: 'imported' as const } : item)
  ), [importedIds, initialItems, selectedSourceSet?.id]);

  const selectedItems = useMemo(() => (
    currentItems.filter((item) => selectedRowKeys.includes(item.id) && item.status !== 'blocked' && item.status !== 'imported')
  ), [currentItems, selectedRowKeys]);

  const metrics = useMemo(() => {
    const ready = currentItems.filter((item) => item.status === 'ready').length;
    const warning = currentItems.filter((item) => item.status === 'warning').length;
    const blocked = currentItems.filter((item) => item.status === 'blocked').length;
    const totalCount = currentItems.reduce((sum, item) => sum + item.count, 0);
    return { ready, warning, blocked, total: currentItems.length, totalCount };
  }, [currentItems]);

  const handleLogin = useCallback((values: { account: string }) => {
    emitEvent('on_login_submit', { account: values.account });
    setMode('tasks');
    message.success('已进入导账工作台');
  }, [emitEvent]);

  const handleSourceSoftwareChange = useCallback((nextSoftware: Software) => {
    const nextTarget = oppositeSoftware(nextSoftware);
    const nextSourceSet = ledgerSets.find((item) => item.software === nextSoftware);
    const nextTargetSet = ledgerSets.find((item) => item.software === nextTarget);
    setSourceSoftware(nextSoftware);
    setTargetSoftware(nextTarget);
    setSelectedSourceSetId(nextSourceSet?.id ?? '');
    setSelectedTargetSetId(nextTargetSet?.id ?? '');
  }, [ledgerSets]);

  const submitSourceCollect = useCallback((values?: { merchant?: string; account?: string }) => {
    const formValues = values ?? sourceForm.getFieldsValue();
    const merchant = formValues.merchant || sourceMerchant;
    setSourceMerchant(merchant);
    emitEvent('on_source_collect_submit', {
      sourceSoftware,
      merchant,
      account: formValues.account || 'source_admin'
    });
    setMode('collecting');
    window.setTimeout(() => {
      setMode('targetAuth');
      emitEvent('on_collect_finish', { ledgerSets: collectedLedgerSets, items: currentItems });
      message.success('异步采集任务已完成，请授权新财务软件');
    }, 1000);
  }, [collectedLedgerSets, currentItems, emitEvent, sourceForm, sourceMerchant, sourceSoftware]);

  const submitTargetAuth = useCallback((values?: { merchant?: string; account?: string }) => {
    const formValues = values ?? targetForm.getFieldsValue();
    const merchant = formValues.merchant || targetMerchant;
    setTargetMerchant(merchant);
    emitEvent('on_target_auth_submit', {
      targetSoftware,
      merchant,
      account: formValues.account || 'target_admin'
    });
    setMode('selectImport');
    message.success('目标财务软件授权通过，可以选择导入账套和数据');
  }, [emitEvent, targetForm, targetMerchant, targetSoftware]);

  const handleSelectionChange = useCallback((keys: React.Key[]) => {
    setSelectedRowKeys(keys);
    emitEvent('on_selection_change', {
      importMode,
      selectedItems: currentItems.filter((item) => keys.includes(item.id))
    });
  }, [currentItems, emitEvent, importMode]);

  const startImport = useCallback(() => {
    if (selectedItems.length === 0) {
      message.warning('请先选择要导入的数据');
      return;
    }
    setImportModalOpen(false);
    setMode('importing');
    emitEvent('on_import_start', {
      sourceSoftware,
      targetSoftware,
      sourceMerchant,
      targetMerchant,
      importMode,
      sourceSet: selectedSourceSet,
      targetSet: selectedTargetSet,
      selectedItems
    });
    window.setTimeout(() => {
      const nextRecord: ImportRecord = {
        id: `IMP-${Date.now()}`,
        sourceSoftware,
        targetSoftware,
        sourceMerchant,
        targetMerchant,
        sourceSet: selectedSourceSet?.name ?? '',
        targetSet: selectedTargetSet?.name ?? '',
        itemCount: selectedItems.length,
        recordCount: selectedItems.reduce((sum, item) => sum + item.count, 0),
        status: '导入成功',
        time: '2026-06-08 14:58'
      };
      setImportedIds(selectedItems.map((item) => item.id));
      setLastImportedCount(selectedItems.length);
      setRecords((current) => [nextRecord, ...current]);
      setMode('done');
      emitEvent('on_import_success', nextRecord);
      message.success('导入成功，已生成导入记录');
    }, 1000);
  }, [emitEvent, selectedItems, selectedSourceSet, selectedTargetSet, sourceMerchant, sourceSoftware, targetMerchant, targetSoftware]);

  const resetFlow = useCallback(() => {
    setMode('sourceAuth');
    setImportedIds([]);
    setLastImportedCount(0);
    setImportMode('skipExisting');
    setSelectedRowKeys(DEFAULT_LEDGER_ITEMS.map((item) => item.id));
  }, []);

  useImperativeHandle(ref, () => ({
    getVar: (name: string) => {
      if (name === 'current_mode') return mode;
      if (name === 'source_software') return sourceSoftware;
      if (name === 'target_software') return targetSoftware;
      if (name === 'source_merchant') return sourceMerchant;
      if (name === 'target_merchant') return targetMerchant;
      if (name === 'selected_items') return selectedItems;
      if (name === 'import_mode') return importMode;
      if (name === 'import_records') return records;
      return undefined;
    },
    fireAction: (name: string) => {
      if (name === 'submit_login') handleLogin({ account: 'demo_admin' });
      if (name === 'start_new_task') resetFlow();
      if (name === 'submit_source_collect') submitSourceCollect();
      if (name === 'finish_collect') setMode('targetAuth');
      if (name === 'submit_target_auth') submitTargetAuth();
      if (name === 'import_selected') startImport();
      if (name === 'reset_flow') resetFlow();
    },
    eventList: EVENT_LIST,
    actionList: ACTION_LIST,
    varList: VAR_LIST,
    configList: CONFIG_LIST,
    dataList: DATA_LIST
  }), [handleLogin, importMode, mode, records, resetFlow, selectedItems, selectedSourceSet, sourceMerchant, sourceSoftware, startImport, submitSourceCollect, submitTargetAuth, targetMerchant, targetSoftware]);

  const groupedItems = useMemo(() => {
    const groups = ['财务数据', '基础资料', '智能记账', '其他'];
    return groups.map((group) => ({
      group,
      items: currentItems.filter((item) => item.category === group)
    }));
  }, [currentItems]);

  const taskStats = useMemo(() => {
    const total = records.length;
    const running = records.filter((item) => item.status === '采集中').length;
    const pending = records.filter((item) => item.status === '待导入').length;
    const done = records.filter((item) => item.status === '导入成功').length;
    return { total, running, pending, done };
  }, [records]);

  const taskStatusClassName = useCallback((status: string) => {
    if (status === '导入成功') return 'ledger-tag ledger-tag--success';
    if (status === '待导入') return 'ledger-tag ledger-tag--warning';
    if (status === '采集中') return 'ledger-tag ledger-tag--info';
    return 'ledger-tag ledger-tag--failed';
  }, []);

  if (mode === 'login') {
    return (
      <main className="ledger-login-page">
        <section className="ledger-login-hero" aria-label="系统价值说明">
          <div className="ledger-login-mark"><SwapOutlined /></div>
          <Tag className="ledger-login-tag">账套采集 · 数据导入 · 记录留痕</Tag>
          <h1>{title}</h1>
          <p>{subtitle}。支持先授权源财务软件采集，再授权新财务软件导入，导入成功后自动形成记录。</p>
          <div className="ledger-login-stats">
            <div><strong>2</strong><span>支持财务软件</span></div>
            <div><strong>7</strong><span>默认数据类型</span></div>
            <div><strong>100%</strong><span>任务留痕</span></div>
          </div>
        </section>

        <Card className="ledger-login-card">
          <div className="ledger-login-card-head">
            <h2>登录导账系统</h2>
            <p>登录后再分别授权源财务软件和新财务软件。</p>
          </div>
          <Form
            form={loginForm}
            layout="vertical"
            requiredMark={false}
            initialValues={{ account: 'migration_admin', password: 'demo_password_2026', remember: true }}
            onFinish={handleLogin}
          >
            <Form.Item label="账号" name="account" rules={[{ required: true, message: '请输入账号' }]}>
              <Input prefix={<UserOutlined />} />
            </Form.Item>
            <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password prefix={<LockOutlined />} />
            </Form.Item>
            <Alert showIcon type="info" title="导账系统账号仅用于进入工作台，财务软件授权会在后续步骤单独填写。" />
            <Button block type="primary" htmlType="submit" icon={<LoginOutlined />} className="ledger-login-submit">
              登录
            </Button>
          </Form>
        </Card>
      </main>
    );
  }

  return (
    <main className="ledger-page">
      <section className="ledger-shell">
        <header className="ledger-topbar">
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={resetFlow}>发起导账任务</Button>
            {mode === 'selectImport' && (
              <Button
                type="primary"
                icon={<ImportOutlined />}
                disabled={selectedItems.length === 0}
                onClick={() => setImportModalOpen(true)}
              >
                导入所选数据
              </Button>
            )}
          </Space>
        </header>

        <div className="ledger-layout">
          <div className="ledger-main">
            {mode === 'tasks' && (
              <Card className="ledger-card">
                <div className="ledger-section-heading">
                  <div>
                    <h2>导账任务</h2>
                    <p>查看当前账号下所有导账任务的采集、待导入和完成情况。</p>
                  </div>
                  <Button type="primary" icon={<CloudDownloadOutlined />} onClick={resetFlow}>发起新的导账任务</Button>
                </div>

                <div className="ledger-task-stats">
                  <div><span>全部任务</span><strong>{taskStats.total}</strong></div>
                  <div><span>采集中</span><strong>{taskStats.running}</strong></div>
                  <div><span>待导入</span><strong>{taskStats.pending}</strong></div>
                  <div><span>已完成</span><strong>{taskStats.done}</strong></div>
                </div>

                <div className="ledger-task-list">
                  {records.map((task) => (
                    <article className="ledger-task-card" key={task.id}>
                      <div className="ledger-task-main">
                        <div>
                          <strong>{task.sourceSet}</strong>
                          <p>{task.sourceSoftware} / {task.sourceMerchant} → {task.targetSoftware} / {task.targetMerchant}</p>
                        </div>
                        <span className={taskStatusClassName(task.status)}>{task.status}</span>
                      </div>
                      <div className="ledger-task-meta">
                        <span>{task.itemCount} 类数据</span>
                        <span>{task.recordCount.toLocaleString('zh-CN')} 条记录</span>
                        <span>{task.time}</span>
                      </div>
                      <div className="ledger-task-actions">
                        {task.status === '待导入' ? (
                          <Button size="small" type="primary" onClick={() => setMode('selectImport')}>继续导入</Button>
                        ) : task.status === '采集中' ? (
                          <Button size="small" onClick={() => setMode('collecting')}>查看进度</Button>
                        ) : (
                          <Button size="small">查看记录</Button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </Card>
            )}

            {mode !== 'tasks' && (
              <Card className="ledger-card ledger-card--steps">
              <Steps
                current={stepIndex(mode)}
                items={[
                  { title: '登录', content: '进入工作台' },
                  { title: '采集授权', content: '源软件账号' },
                  { title: '目标授权', content: '新软件账号' },
                  { title: '选择导入', content: '账套与数据' },
                  { title: '执行导入', content: '异步写入' },
                  { title: '完成记录', content: '结果留痕' }
                ]}
              />
              </Card>
            )}

            {mode === 'sourceAuth' && (
              <Card className="ledger-card">
                <div className="ledger-section-heading">
                  <div>
                    <h2>选择要采集的财务软件</h2>
                    <p>输入该财务软件下的商户/服务商和账号密码，提交后系统创建异步采集任务。</p>
                  </div>
                  <Tag color="purple">只读采集，不修改源账套</Tag>
                </div>
                <Form
                  form={sourceForm}
                  className="ledger-connect-form"
                  layout="vertical"
                  requiredMark={false}
                  initialValues={{ software: sourceSoftware, merchant: sourceMerchant, account: 'source_admin', password: 'demo_password_2026' }}
                  onFinish={submitSourceCollect}
                >
                  <Form.Item label="财务软件名称" name="software" required>
                    <Select
                      value={sourceSoftware}
                      options={SOFTWARES.map((item) => ({ label: item, value: item }))}
                      onChange={handleSourceSoftwareChange}
                    />
                  </Form.Item>
                  <Form.Item label="商户/服务商" name="merchant" rules={[{ required: true, message: '请输入商户/服务商' }]}>
                    <Input placeholder="例如：华东服务商-上海一部" />
                  </Form.Item>
                  <Form.Item label="财务软件账号" name="account" rules={[{ required: true, message: '请输入账号' }]}>
                    <Input prefix={<UserOutlined />} />
                  </Form.Item>
                  <Form.Item label="财务软件密码" name="password" rules={[{ required: true, message: '请输入密码' }]}>
                    <Input.Password prefix={<LockOutlined />} />
                  </Form.Item>
                  <Alert showIcon type="info" title="提交后系统将在后台采集该商户/服务商下可访问的账套数据。" />
                  <div className="ledger-form-actions">
                    <Button type="primary" htmlType="submit" icon={<ApiOutlined />}>提交并开始采集</Button>
                  </div>
                </Form>
              </Card>
            )}

            {mode === 'collecting' && (
              <Card className="ledger-card ledger-collecting">
                <div className="ledger-collect-icon"><FileSearchOutlined /></div>
                <h2>异步采集任务执行中</h2>
                <p>正在从 {sourceSoftware} 的 {sourceMerchant} 采集可访问账套、凭证、工资表、资产、资金和税务数据。</p>
                <Progress percent={72} status="active" strokeColor="#6d5ef7" />
                <div className="ledger-collect-log">
                  <span><CheckCircleOutlined /> 已校验财务软件账号和商户/服务商权限</span>
                  <span><CheckCircleOutlined /> 已发现 {collectedLedgerSets.length} 个可采集账套</span>
                  <span><CloudDownloadOutlined /> 正在采集凭证、工资表与固定资产数据</span>
                </div>
              </Card>
            )}

            {mode === 'targetAuth' && (
              <Card className="ledger-card">
                <div className="ledger-section-heading">
                  <div>
                    <h2>授权新财务软件</h2>
                    <p>采集已完成。请先输入新财务软件下的商户/服务商、账号和密码，再选择导入方式与导入数据。</p>
                  </div>
                  <Tag color="green">采集完成</Tag>
                </div>
                <Form
                  form={targetForm}
                  className="ledger-connect-form"
                  layout="vertical"
                  requiredMark={false}
                  initialValues={{ software: targetSoftware, merchant: targetMerchant, account: 'target_admin', password: 'demo_password_2026' }}
                  onFinish={submitTargetAuth}
                >
                  <Form.Item label="新财务软件名称" name="software" required>
                    <Select
                      value={targetSoftware}
                      options={SOFTWARES.map((item) => ({ label: item, value: item, disabled: item === sourceSoftware }))}
                      onChange={(value) => {
                        setTargetSoftware(value);
                        const firstSet = ledgerSets.find((item) => item.software === value);
                        setSelectedTargetSetId(firstSet?.id ?? '');
                      }}
                    />
                  </Form.Item>
                  <Form.Item label="商户/服务商" name="merchant" rules={[{ required: true, message: '请输入商户/服务商' }]}>
                    <Input placeholder="例如：合规AI直营-上海" />
                  </Form.Item>
                  <Form.Item label="新财务软件账号" name="account" rules={[{ required: true, message: '请输入账号' }]}>
                    <Input prefix={<UserOutlined />} />
                  </Form.Item>
                  <Form.Item label="新财务软件密码" name="password" rules={[{ required: true, message: '请输入密码' }]}>
                    <Input.Password prefix={<LockOutlined />} />
                  </Form.Item>
                  <Alert showIcon type="warning" title="目标授权通过后才能选择导入方式。系统会按企业识别结果处理已创建账套。" />
                  <div className="ledger-form-actions">
                    <Button type="primary" htmlType="submit" icon={<SafetyCertificateOutlined />}>验证并继续</Button>
                  </div>
                </Form>
              </Card>
            )}

            {(mode === 'selectImport' || mode === 'done') && (
              <Card className="ledger-card">
                <div className="ledger-section-heading">
                  <div>
                    <h2>{mode === 'done' ? '导入成功' : '选择导入方式和数据'}</h2>
                    <p>选择遇到已创建账套企业时的处理方式，再勾选本次需要导入的数据。</p>
                  </div>
                </div>

                <div className="ledger-import-mode">
                  <h3>导入方式</h3>
                  <Radio.Group
                    value={importMode}
                    onChange={(event) => setImportMode(event.target.value)}
                    disabled={mode === 'done'}
                  >
                    <Radio.Button value="skipExisting">跳过已创建账套的企业</Radio.Button>
                    <Radio.Button value="overwriteExisting">覆盖已创建账套的企业</Radio.Button>
                  </Radio.Group>
                </div>

                <Divider />
                <Checkbox.Group
                  className="ledger-data-groups"
                  value={selectedRowKeys}
                  onChange={handleSelectionChange}
                  disabled={mode === 'done'}
                >
                  {groupedItems.map((group) => (
                    <section className="ledger-data-group" key={group.group}>
                      <div className="ledger-data-group-head">
                        <h3>{group.group}</h3>
                        <span>{group.items.length} 项</span>
                      </div>
                      <div className="ledger-data-options">
                        {group.items.map((item) => {
                          const meta = statusMeta(item.status);
                          return (
                            <label className="ledger-data-option" key={item.id}>
                              <Checkbox value={item.id} disabled={item.status === 'blocked' || item.status === 'imported'} />
                              <span className="ledger-data-option-main">
                                <strong>{item.name}</strong>
                                <small>{item.count.toLocaleString('zh-CN')} 条 · {toMoney(item.amount)}</small>
                              </span>
                              <span className={meta.className}>{meta.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </Checkbox.Group>

                <Divider />
                <div className="ledger-import-summary">
                  <div>
                    <strong>{mode === 'done' ? `导入成功：${lastImportedCount} 类数据` : `已选择 ${selectedItems.length} 类数据`}</strong>
                    <p>{importMode === 'skipExisting' ? '跳过已创建账套的企业' : '覆盖已创建账套的企业'}；{sourceSoftware} / {sourceMerchant} → {targetSoftware} / {targetMerchant}</p>
                  </div>
                  {mode === 'done' ? (
                    <Space>
                      <Button onClick={resetFlow}>新建采集任务</Button>
                      <Button type="primary">下载导入记录</Button>
                    </Space>
                  ) : (
                    <Button type="primary" icon={<ImportOutlined />} disabled={selectedItems.length === 0} onClick={() => setImportModalOpen(true)}>
                      导入所选数据
                    </Button>
                  )}
                </div>
              </Card>
            )}

            {mode === 'importing' && (
              <Card className="ledger-card ledger-collecting">
                <div className="ledger-collect-icon"><ImportOutlined /></div>
                <h2>正在导入新财务软件</h2>
                <p>正在将 {selectedSourceSet?.name} 的所选数据写入 {targetSoftware} 的 {selectedTargetSet?.name}。</p>
                <Progress percent={91} status="active" strokeColor="#6d5ef7" />
                <div className="ledger-collect-log">
                  <span><CheckCircleOutlined /> 已按导入方式处理已创建账套企业</span>
                  <span><CheckCircleOutlined /> 已写入基础资料、凭证和工资表</span>
                  <span><CloudDownloadOutlined /> 正在生成导入记录和审计日志</span>
                </div>
              </Card>
            )}
          </div>

          <aside className="ledger-assistant" aria-label="导入记录">
            <div className="ledger-assistant-header">
              <div className="ledger-avatar">账</div>
              <div>
                <strong>导入记录</strong>
                <span>成功、异常与审计留痕</span>
              </div>
            </div>
            <div className="ledger-chat">
              <div className="ledger-chat-bubble">
                当前流程：先采集 {sourceSoftware} 下的账套数据，再授权 {targetSoftware}，选择导入方式和数据后执行导入。
              </div>
              <div className="ledger-suggestion">
                <strong>采集结果</strong>
                <span>已发现 {collectedLedgerSets.length} 个账套，当前账套包含 {metrics.total} 类数据，{metrics.blocked} 类暂不可导。</span>
              </div>
              <div className="ledger-suggestion ledger-suggestion--warning">
                <strong>导入策略</strong>
                <span>可选择跳过已创建账套企业，或覆盖已创建账套企业；冲突与处理结果进入记录详情。</span>
              </div>
              <Timeline
                className="ledger-history"
                items={records.map((item) => ({
                  color: item.status === '导入成功' ? 'green' : 'orange',
                  content: (
                    <div>
                      <strong>{item.status}</strong>
                      <span>{item.sourceSet} → {item.targetSet}</span>
                      <small>{item.time} · {item.recordCount.toLocaleString('zh-CN')} 条</small>
                    </div>
                  )
                }))}
              />
            </div>
            <div className="ledger-next-actions">
              <Button block icon={<AuditOutlined />}>查看审计日志</Button>
              <Button block icon={<BankOutlined />}>管理授权账号</Button>
              <Button block icon={<FileProtectOutlined />}>导出导入记录</Button>
            </div>
          </aside>
        </div>
      </section>

      <Modal
        title="确认导入所选数据"
        open={importModalOpen}
        okText="开始导入"
        cancelText="返回检查"
        onOk={startImport}
        onCancel={() => setImportModalOpen(false)}
      >
        <div className="ledger-confirm">
          <p><strong>导入方式：</strong>{importMode === 'skipExisting' ? '跳过已创建账套的企业' : '覆盖已创建账套的企业'}</p>
          <p><strong>授权路径：</strong>{sourceSoftware} / {sourceMerchant} → {targetSoftware} / {targetMerchant}</p>
          <p><strong>导入范围：</strong>{selectedItems.length} 类数据，合计 {selectedItems.reduce((sum, item) => sum + item.count, 0).toLocaleString('zh-CN')} 条记录。</p>
          <Alert
            showIcon
            type="warning"
            title="系统将按所选导入方式处理已创建账套企业；未勾选数据不会进入本次导入。"
          />
        </div>
      </Modal>
    </main>
  );
});

export default Component;
