/**
 * @name 停止服务配置抽屉
 * @mode axure
 *
 * 参考资料：
 * - /rules/design-guide.md
 * - /rules/development-guide.md
 * - /src/prototypes/stop-service-config/spec.md
 * - /Users/caoyi/.agents/skills/服务商设计规范/SKILL.md
 */

import './style.css';
import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  ConfigProvider,
  Divider,
  Form,
  InputNumber,
  Radio,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Timeline,
  Typography,
  message
} from 'antd';
import {
  BellOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseOutlined,
  ClockCircleOutlined,
  ControlOutlined,
  FieldTimeOutlined,
  FileProtectOutlined,
  LockOutlined,
  ReloadOutlined,
  SaveOutlined,
  SettingOutlined,
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

type StopServiceScope = 'all' | 'new_contracts' | 'service_package';

type CompanyContract = {
  id: string;
  companyName: string;
  servicePackage: string;
  contractEndDate: string;
  owner: string;
  renewalStatus: 'pending' | 'negotiating' | 'renewed' | 'risk';
};

type StopServiceConfig = {
  enabled: boolean;
  delayMonths: number;
  scope: StopServiceScope;
  reminderNodes: string[];
  freezeNewBusiness: boolean;
  readonlyAccess: boolean;
  notifyOwner: boolean;
};

const EVENT_LIST: EventItem[] = [
  { name: 'onOpenStopServiceConfig', desc: '打开停止服务配置抽屉时触发', payload: '当前配置 JSON 字符串' },
  { name: 'onCloseStopServiceConfig', desc: '关闭停止服务配置抽屉时触发', payload: '当前配置 JSON 字符串' },
  { name: 'onStopServiceConfigChange', desc: '修改停止服务配置时触发', payload: '当前配置 JSON 字符串' },
  { name: 'onSaveStopServiceConfig', desc: '保存停止服务配置时触发', payload: '当前配置 JSON 字符串' },
  { name: 'onResetStopServiceConfig', desc: '恢复合同到期即停止时触发', payload: '当前配置 JSON 字符串' }
];

const ACTION_LIST: Action[] = [
  { name: 'open_drawer', desc: '打开右侧抽屉' },
  { name: 'close_drawer', desc: '关闭右侧抽屉' },
  { name: 'set_delay_months', desc: '设置合同到期后延后停止月数', params: '数字字符串，范围 0-24' },
  { name: 'save_config', desc: '保存当前配置' },
  { name: 'reset_to_original', desc: '恢复原规则：合同到期即停止' }
];

const VAR_LIST: KeyDesc[] = [
  { name: 'drawer_open', desc: '抽屉是否打开' },
  { name: 'enabled', desc: '是否启用延后停止服务' },
  { name: 'delay_months', desc: '合同到期后延后停止月数' },
  { name: 'stop_date_preview', desc: '示例合同的停止服务日期' },
  { name: 'affected_company_count', desc: '受影响企业数量' }
];

const CONFIG_LIST: ConfigItem[] = [
  { type: 'input', attributeId: 'title', displayName: '页面标题', initialValue: '服务策略配置' },
  { type: 'inputNumber', attributeId: 'defaultDelayMonths', displayName: '默认延后月数', initialValue: 3 },
  { type: 'checkbox', attributeId: 'drawerOpen', displayName: '默认打开抽屉', initialValue: true }
];

const DATA_LIST: DataDesc[] = [
  {
    name: 'companies',
    desc: '受停止服务配置影响的企业合同列表',
    keys: [
      { name: 'id', desc: '企业合同唯一标识' },
      { name: 'companyName', desc: '企业名称' },
      { name: 'servicePackage', desc: '服务包名称' },
      { name: 'contractEndDate', desc: '合同到期日' },
      { name: 'owner', desc: '客户负责人' },
      { name: 'renewalStatus', desc: '续约状态' }
    ]
  }
];

const DEFAULT_COMPANIES: CompanyContract[] = [
  {
    id: 'C-1001',
    companyName: '上海澜序智能科技有限公司',
    servicePackage: '企业财税专业版',
    contractEndDate: '2026-06-30',
    owner: '周颖',
    renewalStatus: 'negotiating'
  },
  {
    id: 'C-1002',
    companyName: '杭州北辰贸易有限公司',
    servicePackage: '票财税一体化',
    contractEndDate: '2026-07-15',
    owner: '林启',
    renewalStatus: 'pending'
  },
  {
    id: 'C-1003',
    companyName: '深圳云帆供应链有限公司',
    servicePackage: '集团账务协同版',
    contractEndDate: '2026-08-01',
    owner: '唐宁',
    renewalStatus: 'risk'
  },
  {
    id: 'C-1004',
    companyName: '成都青禾餐饮管理有限公司',
    servicePackage: '企业财税基础版',
    contractEndDate: '2026-08-31',
    owner: '陈可',
    renewalStatus: 'renewed'
  }
];

const SCOPE_LABEL: Record<StopServiceScope, string> = {
  all: '全部企业',
  new_contracts: '仅新签/续签合同',
  service_package: '指定服务包'
};

function safePayload(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function addMonths(dateText: string, months: number) {
  const date = new Date(`${dateText}T00:00:00`);
  const originalDay = date.getDate();
  date.setMonth(date.getMonth() + months);
  if (date.getDate() < originalDay) {
    date.setDate(0);
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(dateText: string) {
  const [year, month, day] = dateText.split('-');
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function statusMeta(status: CompanyContract['renewalStatus']) {
  switch (status) {
    case 'negotiating':
      return { color: 'processing', label: '续约沟通中' };
    case 'renewed':
      return { color: 'success', label: '已续约' };
    case 'risk':
      return { color: 'warning', label: '停止风险' };
    case 'pending':
    default:
      return { color: 'default', label: '待跟进' };
  }
}

const Component = forwardRef<AxureHandle, AxureProps>(function StopServiceConfigDrawer(innerProps, ref) {
  const dataSource = innerProps?.data ?? {};
  const configSource = innerProps?.config ?? {};
  const onEventHandler = typeof innerProps?.onEvent === 'function' ? innerProps.onEvent : undefined;

  const companies = Array.isArray(dataSource.companies) && dataSource.companies.length > 0
    ? dataSource.companies as CompanyContract[]
    : DEFAULT_COMPANIES;

  const initialDelay = typeof configSource.defaultDelayMonths === 'number'
    ? Math.min(Math.max(configSource.defaultDelayMonths, 0), 24)
    : 3;

  const [drawerOpen, setDrawerOpen] = useState(configSource.drawerOpen !== false);
  const [config, setConfig] = useState<StopServiceConfig>({
    enabled: initialDelay > 0,
    delayMonths: initialDelay || 0,
    scope: 'all',
    reminderNodes: ['到期前30天', '停止前7天'],
    freezeNewBusiness: true,
    readonlyAccess: true,
    notifyOwner: true
  });

  const sampleEndDate = companies[0]?.contractEndDate ?? '2026-06-30';
  const effectiveDelay = config.enabled ? config.delayMonths : 0;
  const stopDatePreview = addMonths(sampleEndDate, effectiveDelay);

  const emitEvent = useCallback((eventName: string, payload: unknown) => {
    try {
      onEventHandler?.(eventName, safePayload(payload));
    } catch (error) {
      console.warn('onEvent 调用失败:', error);
    }
  }, [onEventHandler]);

  const changeConfig = useCallback((patch: Partial<StopServiceConfig>) => {
    setConfig((current) => {
      const next = { ...current, ...patch };
      emitEvent('onStopServiceConfigChange', next);
      return next;
    });
  }, [emitEvent]);

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
    emitEvent('onOpenStopServiceConfig', config);
  }, [config, emitEvent]);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    emitEvent('onCloseStopServiceConfig', config);
  }, [config, emitEvent]);

  const resetToOriginal = useCallback(() => {
    const next = { ...config, enabled: false, delayMonths: 0 };
    setConfig(next);
    emitEvent('onResetStopServiceConfig', next);
    message.success('已恢复为合同到期当日停止服务');
  }, [config, emitEvent]);

  const saveConfig = useCallback(() => {
    emitEvent('onSaveStopServiceConfig', {
      ...config,
      stopDatePreview,
      affectedCompanyCount: companies.length
    });
    message.success('停止服务配置已保存');
  }, [companies.length, config, emitEvent, stopDatePreview]);

  const strategyCards = useMemo(() => [
    { title: '自动开通服务', desc: '订单支付后自动开通对应服务包', status: '已启用', active: false },
    { title: '到期续费提醒', desc: '合同到期前 30/15/7 天提醒客户负责人', status: '已启用', active: false },
    {
      title: '停止服务配置',
      desc: config.enabled ? `合同到期后 ${config.delayMonths} 个月停止服务` : '合同到期当日自动停止服务',
      status: config.enabled ? '已配置延后' : '原规则',
      active: true
    },
    { title: '数据保留策略', desc: '停止服务后保留客户账套与票据数据', status: '已启用', active: false }
  ], [config.delayMonths, config.enabled]);

  const tableColumns = [
    {
      title: '企业',
      dataIndex: 'companyName',
      key: 'companyName',
      render: (value: string, record: CompanyContract) => (
        <div className="service-company">
          <strong>{value}</strong>
          <span>{record.servicePackage}</span>
        </div>
      )
    },
    {
      title: '合同到期',
      dataIndex: 'contractEndDate',
      key: 'contractEndDate',
      width: 112,
      render: (value: string) => <span className="service-date">{formatDate(value)}</span>
    },
    {
      title: '停止日期',
      key: 'stopDate',
      width: 112,
      render: (_: unknown, record: CompanyContract) => (
        <span className="service-date service-date--strong">{formatDate(addMonths(record.contractEndDate, effectiveDelay))}</span>
      )
    },
    {
      title: '状态',
      dataIndex: 'renewalStatus',
      key: 'renewalStatus',
      width: 104,
      render: (value: CompanyContract['renewalStatus']) => {
        const meta = statusMeta(value);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      }
    }
  ];

  useImperativeHandle(ref, () => ({
    getVar: (name: string) => {
      const vars: Record<string, unknown> = {
        drawer_open: drawerOpen,
        enabled: config.enabled,
        delay_months: config.delayMonths,
        stop_date_preview: stopDatePreview,
        affected_company_count: companies.length
      };
      return vars[name];
    },
    fireAction: (name: string, params?: string) => {
      if (name === 'open_drawer') openDrawer();
      if (name === 'close_drawer') closeDrawer();
      if (name === 'save_config') saveConfig();
      if (name === 'reset_to_original') resetToOriginal();
      if (name === 'set_delay_months') {
        const value = Number(params);
        if (Number.isFinite(value)) {
          changeConfig({ enabled: value > 0, delayMonths: Math.min(Math.max(value, 0), 24) });
        }
      }
    },
    eventList: EVENT_LIST,
    actionList: ACTION_LIST,
    varList: VAR_LIST,
    configList: CONFIG_LIST,
    dataList: DATA_LIST
  }), [changeConfig, closeDrawer, companies.length, config.delayMonths, config.enabled, drawerOpen, openDrawer, resetToOriginal, saveConfig, stopDatePreview]);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#7566f1',
          borderRadius: 8,
          colorText: '#333333',
          colorTextSecondary: '#6b7280',
          colorBorder: '#e8ecf3',
          fontFamily: '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif'
        }
      }}
    >
      <main className={`stop-service-page ${drawerOpen ? 'stop-service-page--drawer-open' : ''}`}>
        <section className="stop-service-workbench" aria-label="服务策略配置工作台">
          <header className="stop-service-header">
            <div>
              <span className="stop-service-eyebrow"><ControlOutlined /> 服务策略中心</span>
              <h1>{typeof configSource.title === 'string' ? configSource.title : '服务策略配置'}</h1>
              <p>统一维护企业开通、续费、停止和数据保留规则，减少合同到期后的人工处理。</p>
            </div>
            <Space wrap>
              <Tag color={config.enabled ? 'processing' : 'default'}>
                {config.enabled ? '已启用延后停止' : '合同到期即停止'}
              </Tag>
              <Button type="primary" icon={<SettingOutlined />} onClick={openDrawer}>打开配置</Button>
            </Space>
          </header>

          <div className="stop-service-metrics">
            <article>
              <span>当前停止规则</span>
              <strong>{config.enabled ? `到期后 ${config.delayMonths} 个月` : '到期当日'}</strong>
              <small>{config.enabled ? '为续约沟通预留缓冲期' : '沿用原有自动停止规则'}</small>
            </article>
            <article>
              <span>生效范围</span>
              <strong>{SCOPE_LABEL[config.scope]}</strong>
              <small>保存后按范围影响后续停止任务</small>
            </article>
            <article>
              <span>影响企业</span>
              <strong>{companies.length} 家</strong>
              <small>近期合同到期企业已进入预览</small>
            </article>
            <article>
              <span>示例停止日</span>
              <strong>{formatDate(stopDatePreview)}</strong>
              <small>按首个合同样本实时计算</small>
            </article>
          </div>

          <div className="stop-service-content">
            <section className="strategy-panel">
              <div className="panel-title">
                <div>
                  <h2>服务策略</h2>
                  <p>当前选中“停止服务配置”，可从右侧抽屉维护规则。</p>
                </div>
              </div>
              <div className="strategy-list">
                {strategyCards.map((item) => (
                  <button
                    className={`strategy-item ${item.active ? 'strategy-item--active' : ''}`}
                    key={item.title}
                    type="button"
                    onClick={item.active ? openDrawer : undefined}
                  >
                    <span className="strategy-item__icon">
                      {item.active ? <FieldTimeOutlined /> : <FileProtectOutlined />}
                    </span>
                    <span className="strategy-item__body">
                      <strong>{item.title}</strong>
                      <small>{item.desc}</small>
                    </span>
                    <Tag color={item.active ? 'processing' : 'default'}>{item.status}</Tag>
                  </button>
                ))}
              </div>
            </section>

            <section className="preview-panel">
              <div className="panel-title">
                <div>
                  <h2>停止任务预览</h2>
                  <p>展示配置保存后，合同到期企业的停止日期变化。</p>
                </div>
              </div>
              <Table
                columns={tableColumns}
                dataSource={companies}
                pagination={false}
                rowKey="id"
                size="middle"
              />
            </section>
          </div>
        </section>

        {drawerOpen && <button className="drawer-mask" type="button" aria-label="关闭停止服务配置抽屉" onClick={closeDrawer} />}

        <aside className={`stop-service-drawer ${drawerOpen ? 'stop-service-drawer--open' : ''}`} aria-label="停止服务配置抽屉">
          <div className="drawer-head">
            <div>
              <span className="drawer-kicker"><ClockCircleOutlined /> 自动停止服务</span>
              <h2>停止服务配置</h2>
              <p>设置合同到期后几个月再停止服务，保存后进入停止任务计算。</p>
            </div>
            <Button icon={<CloseOutlined />} onClick={closeDrawer} aria-label="关闭抽屉" />
          </div>

          <div className="drawer-body">
            <Alert
              type="info"
              showIcon
              title="原规则：订单合同期到期后自动停止服务"
              description={config.enabled ? `当前将调整为合同到期后 ${config.delayMonths} 个月再停止服务。` : '当前仍保持合同到期当日停止服务。'}
            />

            <section className="drawer-section">
              <div className="drawer-section__title">
                <h3>基础配置</h3>
                <Tag color={config.enabled ? 'processing' : 'default'}>{config.enabled ? '已开启' : '未开启'}</Tag>
              </div>
              <Form layout="vertical" className="drawer-form">
                <Form.Item label="启用延后停止服务">
                  <div className="inline-control">
                    <Switch
                      checked={config.enabled}
                      onChange={(checked) => changeConfig({ enabled: checked, delayMonths: checked ? Math.max(config.delayMonths, 1) : 0 })}
                    />
                    <Text type="secondary">开启后，企业不会在合同到期日立即停止服务。</Text>
                  </div>
                </Form.Item>

                <Form.Item label="合同到期后停止时间">
                  <Radio.Group
                    className="stop-radio-group"
                    value={config.enabled ? 'delayed' : 'immediate'}
                    onChange={(event) => changeConfig({
                      enabled: event.target.value === 'delayed',
                      delayMonths: event.target.value === 'delayed' ? Math.max(config.delayMonths, 1) : 0
                    })}
                  >
                    <Radio.Button value="immediate">到期当日停止</Radio.Button>
                    <Radio.Button value="delayed">到期后延后停止</Radio.Button>
                  </Radio.Group>
                </Form.Item>

                <Form.Item label="延后月数">
                  <Space.Compact className="delay-month-control">
                    <InputNumber
                      min={1}
                      max={24}
                      value={Math.max(config.delayMonths, 1)}
                      disabled={!config.enabled}
                      onChange={(value) => changeConfig({ delayMonths: Number(value || 1), enabled: true })}
                    />
                    <Button disabled>个月</Button>
                  </Space.Compact>
                </Form.Item>

                <Form.Item label="生效范围">
                  <Select
                    value={config.scope}
                    options={[
                      { label: '全部企业', value: 'all' },
                      { label: '仅新签/续签合同', value: 'new_contracts' },
                      { label: '指定服务包', value: 'service_package' }
                    ]}
                    onChange={(value) => changeConfig({ scope: value })}
                  />
                </Form.Item>

                <Form.Item label="提醒节点">
                  <Select
                    mode="multiple"
                    value={config.reminderNodes}
                    options={[
                      { label: '到期前30天', value: '到期前30天' },
                      { label: '到期前15天', value: '到期前15天' },
                      { label: '到期前7天', value: '到期前7天' },
                      { label: '停止前7天', value: '停止前7天' },
                      { label: '停止前1天', value: '停止前1天' }
                    ]}
                    onChange={(value) => changeConfig({ reminderNodes: value })}
                  />
                </Form.Item>
              </Form>
            </section>

            <section className="drawer-section">
              <div className="drawer-section__title">
                <h3>停止后动作</h3>
              </div>
              <div className="action-options">
                <label>
                  <Switch checked={config.freezeNewBusiness} onChange={(checked) => changeConfig({ freezeNewBusiness: checked })} />
                  <span><LockOutlined /> 冻结新增业务</span>
                </label>
                <label>
                  <Switch checked={config.readonlyAccess} onChange={(checked) => changeConfig({ readonlyAccess: checked })} />
                  <span><FileProtectOutlined /> 保留只读访问</span>
                </label>
                <label>
                  <Switch checked={config.notifyOwner} onChange={(checked) => changeConfig({ notifyOwner: checked })} />
                  <span><BellOutlined /> 通知客户负责人</span>
                </label>
              </div>
            </section>

            <section className="drawer-section drawer-section--preview">
              <div className="drawer-section__title">
                <h3>规则预览</h3>
                <span>{companies[0]?.companyName}</span>
              </div>
              <div className="date-preview">
                <div>
                  <span><CalendarOutlined /> 合同到期日</span>
                  <strong>{formatDate(sampleEndDate)}</strong>
                </div>
                <div>
                  <span><WarningOutlined /> 停止服务日</span>
                  <strong>{formatDate(stopDatePreview)}</strong>
                </div>
              </div>
              <Timeline
                className="service-timeline"
                items={[
                  { icon: <CalendarOutlined />, content: `合同到期：${formatDate(sampleEndDate)}` },
                  { icon: <BellOutlined />, content: config.enabled ? `宽限期内发送 ${config.reminderNodes.join('、') || '默认提醒'}` : '到期前按原提醒规则通知客户负责人' },
                  { icon: <CheckCircleOutlined />, color: config.enabled ? 'blue' : 'green', content: `停止服务：${formatDate(stopDatePreview)}` }
                ]}
              />
            </section>

            <section className="drawer-section">
              <div className="drawer-section__title">
                <h3>影响企业</h3>
                <span>{companies.length} 家</span>
              </div>
              <div className="affected-list">
                {companies.slice(0, 3).map((company) => {
                  const meta = statusMeta(company.renewalStatus);
                  return (
                    <div className="affected-item" key={company.id}>
                      <div>
                        <strong>{company.companyName}</strong>
                        <span>{formatDate(company.contractEndDate)} 到期</span>
                      </div>
                      <Tag color={meta.color}>{meta.label}</Tag>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="drawer-footer">
            <Button onClick={closeDrawer}>取消</Button>
            <Button icon={<ReloadOutlined />} onClick={resetToOriginal}>恢复原规则</Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={saveConfig}>保存配置</Button>
          </div>
        </aside>
      </main>
    </ConfigProvider>
  );
});

Component.displayName = 'StopServiceConfigDrawer';

export default Component;
