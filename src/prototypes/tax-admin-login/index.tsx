/**
 * @name 财税管理后台登录页
 * @mode axure
 *
 * 参考资料：
 * - /Users/caoyi/.codex/skills/ui-ux-pro-max/SKILL.md
 * - /rules/design-guide.md
 * - /rules/development-guide.md
 * - /src/themes/antd-new/DESIGN.md
 */

import './style.css';
import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  ConfigProvider,
  Divider,
  Form,
  Input,
  Select,
  Space,
  Tag,
  Typography,
  message
} from 'antd';
import {
  AuditOutlined,
  BankOutlined,
  CheckCircleOutlined,
  FieldTimeOutlined,
  FileProtectOutlined,
  IdcardOutlined,
  LockOutlined,
  LoginOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
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

type Tenant = {
  id: string;
  name: string;
  taxNo: string;
  status: string;
};

type NoticeTone = 'safe' | 'warning' | 'info';

type NoticeItem = {
  label: string;
  value: string;
  tone: NoticeTone;
};

type LoginFormValues = {
  tenantId: string;
  account: string;
  password: string;
  captcha: string;
  remember: boolean;
};

const DEFAULT_TENANTS: Tenant[] = [
  {
    id: 'sh-yunheng',
    name: '上海云衡科技有限公司',
    taxNo: '91310000MA1K3TAX8F',
    status: '一般纳税人 · 申报正常'
  },
  {
    id: 'hz-qingzhou',
    name: '杭州青舟供应链有限公司',
    taxNo: '91330110MA2K8FIN3P',
    status: '小规模纳税人 · 待复核'
  },
  {
    id: 'sz-mingce',
    name: '深圳明策咨询合伙企业',
    taxNo: '91440300MA5TAX02Y',
    status: '一般纳税人 · 风险关注'
  }
];

const DEFAULT_NOTICE_ITEMS: NoticeItem[] = [
  { label: '本月申报', value: '剩余 6 天', tone: 'warning' },
  { label: '票据同步', value: '98.6%', tone: 'safe' },
  { label: '风险待办', value: '4 项', tone: 'warning' },
  { label: '审计留痕', value: '已开启', tone: 'info' }
];

const EVENT_LIST: EventItem[] = [
  { name: 'onLoginSubmit', desc: '登录表单提交成功时触发', payload: '登录表单与租户信息 JSON 字符串' },
  { name: 'onTenantChange', desc: '切换企业主体时触发', payload: '当前企业主体 JSON 字符串' },
  { name: 'onForgotPassword', desc: '点击忘记密码时触发', payload: '当前企业主体 JSON 字符串' },
  { name: 'onSsoLogin', desc: '点击统一身份登录时触发', payload: '当前企业主体 JSON 字符串' }
];

const ACTION_LIST: Action[] = [
  { name: 'submit_login', desc: '触发一次模拟登录提交' },
  { name: 'switch_tenant', desc: '切换当前企业主体', params: '企业主体 id' }
];

const VAR_LIST: KeyDesc[] = [
  { name: 'current_tenant', desc: '当前选中的企业主体' },
  { name: 'login_status', desc: '当前登录状态' }
];

const CONFIG_LIST: ConfigItem[] = [
  { type: 'input', attributeId: 'systemName', displayName: '系统名称', initialValue: '云账税控台' },
  { type: 'input', attributeId: 'subtitle', displayName: '系统说明', initialValue: '企业财税合规管理后台' },
  { type: 'input', attributeId: 'securityText', displayName: '安全提示', initialValue: '已启用等保二级访问审计' }
];

const DATA_LIST: DataDesc[] = [
  {
    name: 'tenants',
    desc: '企业主体列表',
    keys: [
      { name: 'id', desc: '企业主体唯一标识' },
      { name: 'name', desc: '企业主体名称' },
      { name: 'taxNo', desc: '纳税人识别号' },
      { name: 'status', desc: '企业主体状态' }
    ]
  },
  {
    name: 'noticeItems',
    desc: '登录页摘要指标',
    keys: [
      { name: 'label', desc: '指标名称' },
      { name: 'value', desc: '指标值' },
      { name: 'tone', desc: '指标语义色' }
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

function getNoticeIcon(tone: NoticeTone) {
  if (tone === 'safe') return <CheckCircleOutlined />;
  if (tone === 'warning') return <WarningOutlined />;
  return <AuditOutlined />;
}

const Component = forwardRef<AxureHandle, AxureProps>(function TaxAdminLogin(innerProps, ref) {
  const dataSource = innerProps?.data ?? {};
  const configSource = innerProps?.config ?? {};
  const onEventHandler = typeof innerProps?.onEvent === 'function' ? innerProps.onEvent : undefined;

  const tenants = useMemo<Tenant[]>(() => {
    return Array.isArray(dataSource.tenants) && dataSource.tenants.length > 0
      ? dataSource.tenants
      : DEFAULT_TENANTS;
  }, [dataSource.tenants]);

  const noticeItems = useMemo<NoticeItem[]>(() => {
    return Array.isArray(dataSource.noticeItems) && dataSource.noticeItems.length > 0
      ? dataSource.noticeItems
      : DEFAULT_NOTICE_ITEMS;
  }, [dataSource.noticeItems]);

  const systemName = String(configSource.systemName ?? '云账税控台');
  const subtitle = String(configSource.subtitle ?? '企业财税合规管理后台');
  const securityText = String(configSource.securityText ?? '已启用等保二级访问审计');

  const [form] = Form.useForm<LoginFormValues>();
  const [tenantId, setTenantId] = useState(tenants[0]?.id ?? '');
  const [loginStatus, setLoginStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const currentTenant = useMemo(() => {
    return tenants.find((tenant) => tenant.id === tenantId) ?? tenants[0];
  }, [tenantId, tenants]);

  const emitEvent = useCallback(
    (name: string, payload?: unknown) => {
      onEventHandler?.(name, payload === undefined ? undefined : safePayload(payload));
    },
    [onEventHandler]
  );

  const handleTenantChange = useCallback(
    (nextTenantId: string) => {
      setTenantId(nextTenantId);
      const nextTenant = tenants.find((tenant) => tenant.id === nextTenantId);
      emitEvent('onTenantChange', nextTenant);
    },
    [emitEvent, tenants]
  );

  const handleLogin = useCallback(
    (values: LoginFormValues) => {
      const payload = {
        ...values,
        tenant: currentTenant,
        submittedAt: new Date().toISOString()
      };
      setLoginStatus('loading');
      window.setTimeout(() => {
        setLoginStatus('success');
        message.success('登录校验已通过，正在进入财税工作台');
        emitEvent('onLoginSubmit', payload);
      }, 650);
    },
    [currentTenant, emitEvent]
  );

  const handleForgotPassword = useCallback(() => {
    emitEvent('onForgotPassword', currentTenant);
    message.info('已进入密码找回流程');
  }, [currentTenant, emitEvent]);

  const handleSsoLogin = useCallback(() => {
    emitEvent('onSsoLogin', currentTenant);
    message.info('正在跳转统一身份认证');
  }, [currentTenant, emitEvent]);

  useImperativeHandle(
    ref,
    () => ({
      getVar(name: string) {
        if (name === 'current_tenant') return currentTenant;
        if (name === 'login_status') return loginStatus;
        return undefined;
      },
      fireAction(name: string, params?: string) {
        if (name === 'switch_tenant' && params) {
          handleTenantChange(params);
          form.setFieldValue('tenantId', params);
        }
        if (name === 'submit_login') {
          form.submit();
        }
      },
      eventList: EVENT_LIST,
      actionList: ACTION_LIST,
      varList: VAR_LIST,
      configList: CONFIG_LIST,
      dataList: DATA_LIST
    }),
    [currentTenant, form, handleTenantChange, loginStatus]
  );

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#059669',
          colorInfo: '#1E3A5F',
          borderRadius: 8,
          controlHeight: 44,
          fontFamily: '"MiSans", "PingFang SC", "Microsoft YaHei", sans-serif'
        }
      }}
    >
      <main className="tax-login" aria-label="财税管理后台登录页">
        <section className="tax-login__shell">
          <div className="tax-login__insight" aria-label="登录前财税摘要">
            <div className="tax-login__brand">
              <div className="tax-login__mark" aria-hidden="true">
                <FileProtectOutlined />
              </div>
              <div>
                <p className="tax-login__eyebrow">Tax Compliance Console</p>
                <h1>{systemName}</h1>
                <p>{subtitle}</p>
              </div>
            </div>

            <div className="tax-login__statement">
              <Tag color="success" icon={<SafetyCertificateOutlined />}>可信登录</Tag>
              <Tag color="processing" icon={<AuditOutlined />}>全链路审计</Tag>
              <Tag color="warning" icon={<FieldTimeOutlined />}>申报提醒</Tag>
            </div>

            <div className="tax-ledger" aria-label="财税状态摘要">
              <div className="tax-ledger__top">
                <div>
                  <span className="tax-ledger__label">当前主体</span>
                  <strong>{currentTenant?.name}</strong>
                </div>
                <BankOutlined />
              </div>
              <dl className="tax-ledger__details">
                <div>
                  <dt>纳税人识别号</dt>
                  <dd>{currentTenant?.taxNo}</dd>
                </div>
                <div>
                  <dt>账套状态</dt>
                  <dd>{currentTenant?.status}</dd>
                </div>
              </dl>
              <div className="tax-ledger__grid">
                {noticeItems.map((item) => (
                  <div className={`tax-notice tax-notice--${item.tone}`} key={item.label}>
                    <span aria-hidden="true">{getNoticeIcon(item.tone)}</span>
                    <div>
                      <small>{item.label}</small>
                      <strong>{item.value}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="tax-login__audit-line">
              <CheckCircleOutlined />
              <span>最近一次安全巡检：今天 09:18，未发现异常登录风险</span>
            </div>
          </div>

          <div className="tax-login__panel" aria-label="账号登录">
            <div className="tax-login__panel-header">
              <Space size={10} align="center">
                <SafetyCertificateOutlined />
                <Text strong>安全访问</Text>
              </Space>
              <Text type="secondary">财务数据加密传输</Text>
            </div>

            <div className="tax-login__title-block">
              <h2>登录财税工作台</h2>
              <p>{securityText}</p>
            </div>

            <Alert
              className="tax-login__alert"
              type="info"
              showIcon
              message="请确认企业主体后再登录，所有操作将写入审计日志。"
            />

            <Form<LoginFormValues>
              form={form}
              layout="vertical"
              name="tax-admin-login"
              requiredMark={false}
              initialValues={{
                tenantId,
                account: 'finance.admin',
                remember: true
              }}
              onFinish={handleLogin}
            >
              <Form.Item
                label="企业主体"
                name="tenantId"
                rules={[{ required: true, message: '请选择企业主体' }]}
              >
                <Select
                  aria-label="选择企业主体"
                  size="large"
                  onChange={handleTenantChange}
                  options={tenants.map((tenant) => ({
                    label: tenant.name,
                    value: tenant.id
                  }))}
                />
              </Form.Item>

              <Form.Item
                label="账号"
                name="account"
                rules={[{ required: true, message: '请输入手机号、邮箱或工号' }]}
              >
                <Input
                  autoComplete="username"
                  prefix={<UserOutlined aria-hidden="true" />}
                  placeholder="手机号 / 邮箱 / 工号"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                label="密码"
                name="password"
                rules={[{ required: true, message: '请输入登录密码' }]}
              >
                <Input.Password
                  autoComplete="current-password"
                  prefix={<LockOutlined aria-hidden="true" />}
                  placeholder="请输入登录密码"
                  size="large"
                />
              </Form.Item>

              <div className="tax-login__captcha-row">
                <Form.Item
                  label="验证码"
                  name="captcha"
                  rules={[{ required: true, message: '请输入验证码' }]}
                >
                  <Input
                    inputMode="numeric"
                    prefix={<IdcardOutlined aria-hidden="true" />}
                    placeholder="6 位验证码"
                    size="large"
                  />
                </Form.Item>
                <button className="tax-login__captcha" type="button" aria-label="刷新验证码">
                  82A6K
                </button>
              </div>

              <div className="tax-login__form-tools">
                <Form.Item name="remember" valuePropName="checked" noStyle>
                  <Checkbox>记住此设备 7 天</Checkbox>
                </Form.Item>
                <Button type="link" onClick={handleForgotPassword}>
                  忘记密码
                </Button>
              </div>

              <Button
                block
                className="tax-login__submit"
                htmlType="submit"
                icon={<LoginOutlined />}
                loading={loginStatus === 'loading'}
                size="large"
                type="primary"
              >
                登录工作台
              </Button>
            </Form>

            <Divider plain>或使用安全认证方式</Divider>

            <div className="tax-login__secondary-actions">
              <Button block icon={<SafetyCertificateOutlined />} onClick={handleSsoLogin}>
                统一身份登录
              </Button>
              <Button block icon={<FileProtectOutlined />} onClick={handleSsoLogin}>
                CA / 税控盘登录
              </Button>
            </div>
          </div>
        </section>
      </main>
    </ConfigProvider>
  );
});

export default Component;
