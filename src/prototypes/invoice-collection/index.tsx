/**
 * @name 发票采集页面
 * @mode axure
 *
 * 参考资料：
 * - /skills/create-workflow/SKILL.md
 * - /skills/axure-export-workflow/SKILL.md
 * - /rules/design-guide.md
 * - /rules/development-guide.md
 * - /rules/axure-api-guide.md
 */

import './style.css';
import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Divider,
  Progress,
  Row,
  Space,
  Steps,
  Tag,
  Typography,
  message
} from 'antd';
import {
  CheckCircleOutlined,
  CloudUploadOutlined,
  ExclamationCircleOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  ReloadOutlined,
  SaveOutlined,
  SendOutlined,
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

type InvoiceStatus = 'recognizing' | 'pending' | 'warning' | 'submitted';

type InvoiceItem = {
  id: string;
  title: string;
  seller: string;
  buyer: string;
  invoiceNo: string;
  invoiceCode: string;
  date: string;
  amount: number;
  tax: number;
  total: number;
  status: InvoiceStatus;
  issues: string[];
};

const EVENT_LIST: EventItem[] = [
  { name: 'onInvoiceSelect', desc: '切换发票时触发', payload: '当前发票 JSON 字符串' },
  { name: 'onInvoiceUpload', desc: '模拟上传发票时触发', payload: '新增发票 JSON 字符串' },
  { name: 'onReRecognize', desc: '重新识别当前发票时触发', payload: '当前发票 JSON 字符串' },
  { name: 'onSubmitInvoice', desc: '提交当前发票时触发', payload: '当前发票 JSON 字符串' },
  { name: 'onSaveDraft', desc: '保存草稿时触发', payload: '当前采集状态 JSON 字符串' }
];

const ACTION_LIST: Action[] = [
  { name: 'submit_current_invoice', desc: '提交当前选中发票' },
  { name: 'add_invoice', desc: '追加一张发票', params: '发票 JSON 字符串' }
];

const VAR_LIST: KeyDesc[] = [
  { name: 'selected_invoice', desc: '当前选中的发票' },
  { name: 'invoice_count', desc: '当前发票数量' }
];

const CONFIG_LIST: ConfigItem[] = [
  { type: 'input', attributeId: 'title', displayName: '页面标题', info: '显示在页面顶部的标题', initialValue: '发票采集' },
  { type: 'input', attributeId: 'subtitle', displayName: '页面说明', info: '显示在页面标题下方的说明', initialValue: '上传、识别并校验报销发票' }
];

const DATA_LIST: DataDesc[] = [
  {
    name: 'invoices',
    desc: '发票采集列表',
    keys: [
      { name: 'id', desc: '发票唯一标识' },
      { name: 'title', desc: '发票名称' },
      { name: 'seller', desc: '销售方名称' },
      { name: 'buyer', desc: '购买方名称' },
      { name: 'invoiceNo', desc: '发票号码' },
      { name: 'invoiceCode', desc: '发票代码' },
      { name: 'date', desc: '开票日期' },
      { name: 'amount', desc: '不含税金额' },
      { name: 'tax', desc: '税额' },
      { name: 'total', desc: '价税合计' },
      { name: 'status', desc: '发票状态' },
      { name: 'issues', desc: '校验提示列表' }
    ]
  }
];

const DEFAULT_INVOICES: InvoiceItem[] = [
  {
    id: 'INV-001',
    title: '办公用品增值税电子普通发票',
    seller: '上海晨光科力普办公用品有限公司',
    buyer: '某某科技有限公司',
    invoiceNo: '04983271',
    invoiceCode: '031002300411',
    date: '2026-05-20',
    amount: 1280,
    tax: 76.8,
    total: 1356.8,
    status: 'pending',
    issues: []
  },
  {
    id: 'INV-002',
    title: '差旅住宿增值税专用发票',
    seller: '杭州西溪商务酒店有限公司',
    buyer: '某某科技有限公司',
    invoiceNo: '78120466',
    invoiceCode: '033002400219',
    date: '2026-05-18',
    amount: 2160,
    tax: 129.6,
    total: 2289.6,
    status: 'warning',
    issues: ['疑似重复发票，请复核发票号码', '住宿费用超过部门单笔报销提醒线']
  },
  {
    id: 'INV-003',
    title: '软件服务费电子发票',
    seller: '北京云账本科技有限公司',
    buyer: '某某科技有限公司',
    invoiceNo: '24091873',
    invoiceCode: '011002400782',
    date: '2026-05-16',
    amount: 5800,
    tax: 348,
    total: 6148,
    status: 'submitted',
    issues: []
  },
  {
    id: 'INV-004',
    title: '交通出行电子普通发票',
    seller: '深圳市城市出行服务有限公司',
    buyer: '某某科技有限公司',
    invoiceNo: '90331846',
    invoiceCode: '044002400193',
    date: '2026-05-22',
    amount: 342.5,
    tax: 10.28,
    total: 352.78,
    status: 'recognizing',
    issues: []
  }
];

function toMoney(value: number) {
  return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusMeta(status: InvoiceStatus) {
  switch (status) {
    case 'recognizing':
      return { color: 'processing', label: '识别中', step: 1 };
    case 'warning':
      return { color: 'warning', label: '待复核', step: 2 };
    case 'submitted':
      return { color: 'success', label: '已提交', step: 3 };
    case 'pending':
    default:
      return { color: 'blue', label: '待校验', step: 2 };
  }
}

function safePayload(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function createUploadedInvoice(index: number): InvoiceItem {
  return {
    id: `INV-${String(index).padStart(3, '0')}`,
    title: '新上传餐饮服务电子发票',
    seller: '上海柏悦餐饮管理有限公司',
    buyer: '某某科技有限公司',
    invoiceNo: String(86000000 + index * 37),
    invoiceCode: '031002400618',
    date: '2026-05-26',
    amount: 468,
    tax: 28.08,
    total: 496.08,
    status: 'pending',
    issues: ['餐饮费用需补充同行人或业务说明']
  };
}

const Component = forwardRef<AxureHandle, AxureProps>(function InvoiceCollection(innerProps, ref) {
  const dataSource = innerProps?.data ?? {};
  const configSource = innerProps?.config ?? {};
  const onEventHandler = typeof innerProps?.onEvent === 'function' ? innerProps.onEvent : undefined;

  const initialInvoices = Array.isArray(dataSource.invoices) && dataSource.invoices.length > 0
    ? dataSource.invoices as InvoiceItem[]
    : DEFAULT_INVOICES;

  const [invoices, setInvoices] = useState<InvoiceItem[]>(initialInvoices);
  const [selectedId, setSelectedId] = useState(initialInvoices[0]?.id ?? '');

  const title = typeof configSource.title === 'string' && configSource.title ? configSource.title : '发票采集';
  const subtitle = typeof configSource.subtitle === 'string' && configSource.subtitle
    ? configSource.subtitle
    : '上传、识别并校验报销发票';

  const selectedInvoice = useMemo(() => {
    return invoices.find((invoice) => invoice.id === selectedId) ?? invoices[0];
  }, [invoices, selectedId]);

  const metrics = useMemo(() => {
    const pending = invoices.filter((invoice) => invoice.status === 'pending').length;
    const warning = invoices.filter((invoice) => invoice.status === 'warning').length;
    const submitted = invoices.filter((invoice) => invoice.status === 'submitted').length;
    const totalAmount = invoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
    return { pending, warning, submitted, totalAmount };
  }, [invoices]);

  const emitEvent = useCallback((eventName: string, payload: unknown) => {
    try {
      onEventHandler?.(eventName, safePayload(payload));
    } catch (error) {
      console.warn('onEvent 调用失败:', error);
    }
  }, [onEventHandler]);

  const updateInvoice = useCallback((invoiceId: string, patch: Partial<InvoiceItem>) => {
    setInvoices((current) => current.map((invoice) => (
      invoice.id === invoiceId ? { ...invoice, ...patch } : invoice
    )));
  }, []);

  const handleSelect = useCallback((invoice: InvoiceItem) => {
    setSelectedId(invoice.id);
    emitEvent('onInvoiceSelect', invoice);
  }, [emitEvent]);

  const handleUpload = useCallback(() => {
    const nextInvoice = createUploadedInvoice(invoices.length + 1);
    setInvoices((current) => [nextInvoice, ...current]);
    setSelectedId(nextInvoice.id);
    emitEvent('onInvoiceUpload', nextInvoice);
    message.success('已模拟上传 1 张发票');
  }, [emitEvent, invoices.length]);

  const handleReRecognize = useCallback(() => {
    if (!selectedInvoice) return;
    updateInvoice(selectedInvoice.id, { status: 'recognizing' });
    emitEvent('onReRecognize', selectedInvoice);
    window.setTimeout(() => {
      updateInvoice(selectedInvoice.id, { status: selectedInvoice.issues.length > 0 ? 'warning' : 'pending' });
    }, 800);
  }, [emitEvent, selectedInvoice, updateInvoice]);

  const handleSubmit = useCallback(() => {
    if (!selectedInvoice) return;
    const submittedInvoice = { ...selectedInvoice, status: 'submitted' as InvoiceStatus };
    updateInvoice(selectedInvoice.id, { status: 'submitted' });
    emitEvent('onSubmitInvoice', submittedInvoice);
    message.success('发票已提交审核');
  }, [emitEvent, selectedInvoice, updateInvoice]);

  const handleSaveDraft = useCallback(() => {
    emitEvent('onSaveDraft', { selectedInvoice, invoices });
    message.success('草稿已保存');
  }, [emitEvent, invoices, selectedInvoice]);

  useImperativeHandle(ref, () => ({
    getVar: (name: string) => {
      const vars: Record<string, unknown> = {
        selected_invoice: selectedInvoice,
        invoice_count: invoices.length
      };
      return vars[name];
    },
    fireAction: (name: string, params?: string) => {
      if (name === 'submit_current_invoice') {
        handleSubmit();
        return;
      }
      if (name === 'add_invoice') {
        try {
          const parsed = params ? JSON.parse(params) as InvoiceItem : createUploadedInvoice(invoices.length + 1);
          setInvoices((current) => [parsed, ...current]);
          setSelectedId(parsed.id);
        } catch {
          const fallback = createUploadedInvoice(invoices.length + 1);
          setInvoices((current) => [fallback, ...current]);
          setSelectedId(fallback.id);
        }
      }
    },
    eventList: EVENT_LIST,
    actionList: ACTION_LIST,
    varList: VAR_LIST,
    configList: CONFIG_LIST,
    dataList: DATA_LIST
  }), [handleSubmit, invoices, selectedInvoice]);

  const selectedMeta = selectedInvoice ? statusMeta(selectedInvoice.status) : statusMeta('pending');
  const validationItems = selectedInvoice?.issues.length
    ? selectedInvoice.issues.map((issue) => ({ type: 'warning' as const, text: issue }))
    : [
      { type: 'ok' as const, text: '发票抬头与企业主体一致' },
      { type: 'ok' as const, text: '发票号码未命中重复记录' },
      { type: 'ok' as const, text: '价税合计与报销金额一致' }
    ];

  return (
    <main className="invoice-collection">
      <header className="invoice-collection__header">
        <div>
          <h1 className="invoice-collection__title">{title}</h1>
          <Text className="invoice-collection__subtitle">{subtitle}</Text>
        </div>
        <div className="invoice-collection__actions">
          <Button icon={<SaveOutlined />} onClick={handleSaveDraft}>保存草稿</Button>
          <Button icon={<ReloadOutlined />} onClick={handleReRecognize} disabled={!selectedInvoice}>重新识别</Button>
          <Button type="primary" icon={<SendOutlined />} onClick={handleSubmit} disabled={!selectedInvoice}>提交审核</Button>
        </div>
      </header>

      <Row gutter={[16, 16]} className="invoice-collection__metrics">
        <Col xs={24} sm={12} lg={6}>
          <Card className="invoice-metric">
            <div className="invoice-metric__meta">
              <span className="invoice-metric__label">今日采集</span>
              <FileTextOutlined style={{ color: '#2563eb' }} />
            </div>
            <div className="invoice-metric__value">{invoices.length}</div>
            <div className="invoice-metric__hint">含上传、识别中和待复核票据</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="invoice-metric">
            <div className="invoice-metric__meta">
              <span className="invoice-metric__label">待校验</span>
              <FileSearchOutlined style={{ color: '#0891b2' }} />
            </div>
            <div className="invoice-metric__value">{metrics.pending}</div>
            <div className="invoice-metric__hint">建议优先处理今日新增票据</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="invoice-metric">
            <div className="invoice-metric__meta">
              <span className="invoice-metric__label">异常票据</span>
              <WarningOutlined style={{ color: '#b45309' }} />
            </div>
            <div className="invoice-metric__value">{metrics.warning}</div>
            <div className="invoice-metric__hint">重复、超限或字段缺失需复核</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="invoice-metric">
            <div className="invoice-metric__meta">
              <span className="invoice-metric__label">可报销金额</span>
              <CheckCircleOutlined style={{ color: '#15803d' }} />
            </div>
            <div className="invoice-metric__value">{toMoney(metrics.totalAmount)}</div>
            <div className="invoice-metric__hint">已提交 {metrics.submitted} 张，待继续流转</div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="invoice-workspace">
        <Col xs={24} lg={9}>
          <Card title="采集队列" className="invoice-panel">
            <section className="invoice-upload" aria-label="上传发票">
              <span className="invoice-upload__icon"><CloudUploadOutlined /></span>
              <div className="invoice-upload__title">拖拽或选择发票文件</div>
              <div className="invoice-upload__desc">支持 PDF、OFD、JPG、PNG，单次最多 20 张</div>
              <Button type="primary" icon={<CloudUploadOutlined />} onClick={handleUpload}>模拟上传</Button>
            </section>

            <div className="invoice-list">
              {invoices.map((invoice) => {
                const meta = statusMeta(invoice.status);
                const selected = selectedInvoice?.id === invoice.id;
                return (
                  <button
                    key={invoice.id}
                    type="button"
                    className={`invoice-list-item${selected ? ' invoice-list-item--selected' : ''}`}
                    onClick={() => handleSelect(invoice)}
                  >
                    <div className="invoice-list-item__top">
                      <span className="invoice-list-item__title">{invoice.title}</span>
                      <Tag color={meta.color}>{meta.label}</Tag>
                    </div>
                    <span className="invoice-list-item__seller">{invoice.seller}</span>
                    <div className="invoice-list-item__bottom">
                      <span>{invoice.date}</span>
                      <strong>{toMoney(invoice.total)}</strong>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={15}>
          <Card
            title="识别与校验"
            className="invoice-panel"
            extra={selectedInvoice ? <Tag color={selectedMeta.color}>{selectedMeta.label}</Tag> : null}
          >
            {selectedInvoice ? (
              <div className="invoice-detail">
                <div className="invoice-steps">
                  <Steps
                    size="small"
                    current={selectedMeta.step}
                    items={[
                      { title: '上传' },
                      { title: '识别' },
                      { title: selectedInvoice.status === 'warning' ? '复核' : '校验' },
                      { title: '提交' }
                    ]}
                  />
                  {selectedInvoice.status === 'recognizing' ? (
                    <Progress percent={64} status="active" style={{ marginTop: 14 }} />
                  ) : null}
                </div>

                <div className="invoice-detail-grid">
                  <div className="invoice-field">
                    <span className="invoice-field__label">发票名称</span>
                    <span className="invoice-field__value">{selectedInvoice.title}</span>
                  </div>
                  <div className="invoice-field">
                    <span className="invoice-field__label">开票日期</span>
                    <span className="invoice-field__value">{selectedInvoice.date}</span>
                  </div>
                  <div className="invoice-field">
                    <span className="invoice-field__label">发票代码</span>
                    <span className="invoice-field__value">{selectedInvoice.invoiceCode}</span>
                  </div>
                  <div className="invoice-field">
                    <span className="invoice-field__label">发票号码</span>
                    <span className="invoice-field__value">{selectedInvoice.invoiceNo}</span>
                  </div>
                  <div className="invoice-field">
                    <span className="invoice-field__label">销售方</span>
                    <span className="invoice-field__value">{selectedInvoice.seller}</span>
                  </div>
                  <div className="invoice-field">
                    <span className="invoice-field__label">购买方</span>
                    <span className="invoice-field__value">{selectedInvoice.buyer}</span>
                  </div>
                </div>

                <div className="invoice-total">
                  <div className="invoice-total__item">
                    <div className="invoice-total__label">不含税金额</div>
                    <div className="invoice-total__value">{toMoney(selectedInvoice.amount)}</div>
                  </div>
                  <div className="invoice-total__item">
                    <div className="invoice-total__label">税额</div>
                    <div className="invoice-total__value">{toMoney(selectedInvoice.tax)}</div>
                  </div>
                  <div className="invoice-total__item">
                    <div className="invoice-total__label">价税合计</div>
                    <div className="invoice-total__value">{toMoney(selectedInvoice.total)}</div>
                  </div>
                </div>

                <Divider style={{ margin: '4px 0' }} />

                <div className="invoice-validation">
                  {validationItems.map((item) => (
                    <div
                      key={item.text}
                      className={`invoice-validation__item invoice-validation__item--${item.type}`}
                    >
                      {item.type === 'ok' ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>

                <div className="invoice-footer-actions">
                  <Button icon={<SaveOutlined />} onClick={handleSaveDraft}>保存草稿</Button>
                  <Button icon={<ReloadOutlined />} onClick={handleReRecognize}>重新识别</Button>
                  <Button type="primary" icon={<SendOutlined />} onClick={handleSubmit}>提交审核</Button>
                </div>
              </div>
            ) : (
              <Space direction="vertical" align="center" style={{ width: '100%', padding: 48 }}>
                <FileTextOutlined style={{ fontSize: 32, color: '#94a3b8' }} />
                <Text type="secondary">暂无发票，请先上传文件</Text>
              </Space>
            )}
          </Card>
        </Col>
      </Row>
    </main>
  );
});

export default Component;
