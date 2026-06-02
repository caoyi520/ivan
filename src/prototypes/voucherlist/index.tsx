/**
 * @name 猪哥云记账平台
 *
 * 参考资料：
 * - 用户提供的页面截图
 * - src/prototypes/voucherlist/theme.json
 * - src/prototypes/voucherlist/content.md
 * - /rules/design-guide.md
 * - /rules/development-guide.md
 */

import './style.css';
import React, { forwardRef, useImperativeHandle, useState } from 'react';
import {
  Archive,
  BarChart3,
  BookOpen,
  Box,
  BriefcaseBusiness,
  Calculator,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ClipboardList,
  Edit3,
  Folder,
  Home,
  Link2,
  Package,
  Printer,
  Settings,
  Upload,
  WalletCards,
  X
} from 'lucide-react';
import type { AxureHandle, AxureProps } from '../../common/axure-types';

const logoUrl = new URL('./assets/images/o-fPAv8BxWMIfrpwLusAAAAASUVORK5CYII.png', import.meta.url).href;
const avatarUrl = new URL('./assets/images/mf4DxZo5AQBzGoAAAAAASUVORK5CYII.png', import.meta.url).href;

type MenuItem = {
  label: string;
  icon: React.ReactNode;
  expanded?: boolean;
  children?: string[];
};

type VoucherEntry = {
  summary: string;
  subject: string;
  debit?: string;
  credit?: string;
};

type Voucher = {
  no: string;
  date: string;
  tag: string;
  attachment: string;
  attachmentType: string;
  attachmentName: string;
  uploadDate: string;
  maker: string;
  operation?: string;
  ticket?: boolean;
  entries: VoucherEntry[];
};

const menus: MenuItem[] = [
  { label: '首页', icon: <Home size={16} /> },
  { label: '智能记账', icon: <Calculator size={16} /> },
  { label: '凭证', icon: <ClipboardList size={16} />, expanded: true, children: ['录凭证', '查凭证', '凭证汇总表', '序时账', '回收站'] },
  { label: '账簿', icon: <BookOpen size={16} /> },
  { label: '报表', icon: <BarChart3 size={16} /> },
  { label: '资产', icon: <BriefcaseBusiness size={16} /> },
  { label: '库存', icon: <Package size={16} /> },
  { label: '结账', icon: <WalletCards size={16} /> },
  { label: '归档', icon: <Archive size={16} /> },
  { label: '设置', icon: <Settings size={16} /> }
];

const vouchers: Voucher[] = [
  {
    no: '记-1',
    date: '2026-04-30',
    tag: '普通凭证',
    attachment: '0张',
    attachmentType: '进项税额勾选明细',
    attachmentName: '202604进项税额勾选确认单.pdf',
    uploadDate: '2026-04-30',
    maker: '张巧艳',
    operation: '红冲',
    entries: [
      { summary: '勾选进项', subject: '22210101 应交税费_应交增值税_进项税额', debit: '207,557.56' },
      { summary: '勾选进项', subject: '222128 应交税费_待认证进项税额', credit: '207,557.56' }
    ]
  },
  {
    no: '记-2',
    date: '2026-04-30',
    tag: '进销项结转',
    attachment: '0张',
    attachmentType: '结转测算表',
    attachmentName: '202604销项税额结转测算表.xlsx',
    uploadDate: '2026-04-30',
    maker: '张巧艳',
    entries: [
      { summary: '结转本月销项税额', subject: '22210106 应交税费_应交增值税_销项税额', debit: '209,508.49' },
      { summary: '结转本月销项税额', subject: '22210103 应交税费_应交增值税_转出未交增值税', credit: '209,508.49' }
    ]
  },
  {
    no: '记-3',
    date: '2026-04-30',
    tag: '进销项结转',
    attachment: '0张',
    attachmentType: '结转测算表',
    attachmentName: '202604进项税额结转测算表.xlsx',
    uploadDate: '2026-04-30',
    maker: '张巧艳',
    entries: [
      { summary: '结转本月进项税额', subject: '22210103 应交税费_应交增值税_转出未交增值税', debit: '207,557.56' },
      { summary: '结转本月进项税额', subject: '22210101 应交税费_应交增值税_进项税额', credit: '207,557.56' }
    ]
  },
  {
    no: '记-4',
    date: '2026-04-30',
    tag: '普通凭证',
    attachment: '1张',
    attachmentType: '工资表',
    attachmentName: '202604工资单.pdf',
    uploadDate: '2026-04-30',
    maker: '张巧艳',
    operation: '红冲',
    ticket: true,
    entries: [
      { summary: '本月销售收入', subject: '112232 应收账款_拉萨城关区安骐服装店...', debit: '10,325.00' },
      { summary: '本月销售收入', subject: '500101 主营业务收入_销售货物', credit: '9,137.17' },
      { summary: '本月销售收入', subject: '22210106 应交税费_应交增值税_销项税额', credit: '1,187.83' }
    ]
  },
  {
    no: '记-5',
    date: '2026-04-30',
    tag: '普通凭证',
    attachment: '7张',
    attachmentType: '销售收入附件',
    attachmentName: '202604销售收入确认附件.zip',
    uploadDate: '2026-04-30',
    maker: '张巧艳',
    operation: '红冲',
    ticket: true,
    entries: [
      { summary: '本月销售收入', subject: '112206 应收账款_重庆百货大楼股份有限...', debit: '80,998.01' },
      { summary: '本月销售收入', subject: '112212 应收账款_重庆百货大楼股份有限公司', debit: '689,040.39' },
      { summary: '本月销售收入', subject: '112219 应收账款_成都市年然商贸有限公司', debit: '499,635.20' },
      { summary: '本月销售收入', subject: '112223 应收账款_重庆新世界时尚商厦有...', debit: '157,704.08' },
      { summary: '本月销售收入', subject: '112225 应收账款_成都伊藤洋华堂有限公...', debit: '105,504.62' },
      { summary: '本月销售收入', subject: '112233 应收账款_成都市澜力量商贸有限...', debit: '277,905.04' },
      { summary: '本月销售收入', subject: '500101 主营业务收入_销售货物', credit: '1,601,582.00' }
    ]
  }
];

function Sidebar() {
  return (
    <aside className="zgy-sidebar">
      <div className="zgy-logo"><img src={logoUrl} alt="猪哥云" /></div>
      <nav className="zgy-menu">
        {menus.map((item) => (
          <div className="zgy-menu-group" key={item.label}>
            <div className={`zgy-menu-item ${item.expanded ? 'is-open' : ''}`}>
              <span className="zgy-menu-icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.children ? <ChevronDown className="zgy-menu-arrow" size={14} /> : null}
            </div>
            {item.children ? (
              <div className="zgy-submenu">
                {item.children.map((child) => (
                  <div className={`zgy-submenu-item ${child === '查凭证' ? 'is-active' : ''}`} key={child}>{child}</div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </nav>
    </aside>
  );
}

function Header() {
  return (
    <header className="zgy-header">
      <div className="zgy-company">
        <span className="zgy-company-name">成都安骐喜达服饰有限公司</span>
        <ChevronDown size={14} color="#9ca3af" />
        <span className="zgy-tax-tag">一般纳税人</span>
      </div>
      <div className="zgy-header-actions">
        <span><Link2 size={14} />分享账本</span>
        <span><Settings size={14} />账套设置</span>
        <span><Edit3 size={14} />小记(1)</span>
        <span className="zgy-period">当前账期： 2026-05</span>
        <img className="zgy-avatar" src={avatarUrl} alt="头像" />
        <strong>代杨</strong>
      </div>
    </header>
  );
}

function Tabs() {
  return (
    <div className="zgy-tabs">
      <button className="zgy-tab-back"><ChevronLeft size={16} /></button>
      <div className="zgy-tab">首页</div>
      <div className="zgy-tab is-active">查凭证 <span>×</span></div>
      <div className="zgy-tab">录凭证 <span>×</span></div>
      <button className="zgy-tab-tool"><Box size={16} /></button>
      <button className="zgy-tab-next"><ChevronRight size={16} /></button>
    </div>
  );
}

function Toolbar() {
  const buttons = ['合并', '移动', '整理', '复制', '打印', '更多'];
  return (
    <div className="zgy-toolbar">
      <div className="zgy-filter">
        <span>会计期间</span>
        <button className="zgy-date-select">2026-04 <span>~</span> 2026-04 <ChevronDown size={14} /></button>
      </div>
      <div className="zgy-tool-buttons">
        <button className="zgy-primary">新增</button>
        {buttons.map((label) => (
          <button className="zgy-ghost" key={label}>{label === '打印' ? <Printer size={14} /> : null}{label}</button>
        ))}
      </div>
    </div>
  );
}

function VoucherTable({ onOpenAttachment }: { onOpenAttachment: (voucher: Voucher) => void }) {
  return (
    <div className="zgy-table-wrap">
      <table className="zgy-table">
        <colgroup>
          <col style={{ width: 60 }} />
          <col style={{ width: 138 }} />
          <col style={{ width: 128 }} />
          <col style={{ width: 104 }} />
          <col style={{ width: 340 }} />
          <col style={{ width: 300 }} />
          <col style={{ width: 120 }} />
          <col style={{ width: 120 }} />
          <col style={{ width: 120 }} />
          <col style={{ width: 230 }} />
        </colgroup>
        <thead>
          <tr>
            <th><span className="zgy-checkbox" /></th>
            <th>日期</th>
            <th>凭证号 <ChevronsUpDown size={13} /></th>
            <th className="zgy-attachment-head">附单据 <span>新增</span></th>
            <th>摘要</th>
            <th>科目</th>
            <th className="zgy-num">借方金额</th>
            <th className="zgy-num">贷方金额</th>
            <th>制单人</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {vouchers.map((voucher) => (
            <React.Fragment key={voucher.no}>
              {voucher.entries.map((entry, index) => (
                <tr key={`${voucher.no}-${entry.subject}-${index}`}>
                  {index === 0 ? <td rowSpan={voucher.entries.length}><span className="zgy-checkbox" /></td> : null}
                  {index === 0 ? (
                    <td rowSpan={voucher.entries.length}>
                      <div className="zgy-date-cell">{voucher.date}</div>
                      {voucher.ticket ? <a className="zgy-ticket">查看票据</a> : null}
                    </td>
                  ) : null}
                  {index === 0 ? (
                    <td rowSpan={voucher.entries.length}>
                      <div className="zgy-voucher-cell">
                        <a className="zgy-voucher-no">{voucher.no}</a>
                        <span className="zgy-voucher-tag">{voucher.tag}</span>
                      </div>
                    </td>
                  ) : null}
                  {index === 0 ? (
                    <td rowSpan={voucher.entries.length}>
                      <button className="zgy-attachment-link" onClick={() => onOpenAttachment(voucher)}>
                        <span>{voucher.attachment}</span>
                        <small>附件</small>
                      </button>
                    </td>
                  ) : null}
                  <td className="zgy-summary">{entry.summary}</td>
                  <td><div className="zgy-subject" title={entry.subject}>{entry.subject}</div></td>
                  <td className="zgy-num">{entry.debit ?? ''}</td>
                  <td className="zgy-num">{entry.credit ?? ''}</td>
                  {index === 0 ? <td rowSpan={voucher.entries.length}>{voucher.maker}</td> : null}
                  {index === 0 ? <td rowSpan={voucher.entries.length}>{voucher.operation ? <a className="zgy-op">{voucher.operation}</a> : null}</td> : null}
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AttachmentModal({ voucher, onClose }: { voucher: Voucher; onClose: () => void }) {
  const count = Number.parseInt(voucher.attachment, 10) || 1;

  return (
    <div className="zgy-modal-mask" role="presentation" onClick={onClose}>
      <section className="zgy-attachment-modal" role="dialog" aria-modal="true" aria-label="单据附件" onClick={(event) => event.stopPropagation()}>
        <header className="zgy-modal-header">
          <h2>单据附件</h2>
          <button aria-label="关闭" onClick={onClose}><X size={18} /></button>
        </header>
        <div className="zgy-modal-toolbar">
          <div className="zgy-modal-count">共 {count} 张影像， 当前是1/1张 <span>?</span></div>
          <div className="zgy-storage">
            <Folder size={16} />
            <span>上传附件空间</span>
            <i />
            <strong>0.00MB/1.00GB</strong>
          </div>
          <button className="zgy-upload-btn"><Upload size={15} />上传附件</button>
        </div>
        <div className="zgy-modal-body">
          <div className="zgy-preview-panel">
            <div className="zgy-pdf-page">
              <div className="zgy-pdf-title">正常工资薪金工资表</div>
              <div className="zgy-pdf-meta">企业名称：成都安骐喜达服饰有限公司　税款所属期：2026年04月</div>
              <table className="zgy-pdf-table">
                <thead>
                  <tr>
                    <th>序号</th>
                    <th>姓名</th>
                    <th>证照号码</th>
                    <th>工资薪金</th>
                    <th>养老保险</th>
                    <th>医疗保险</th>
                    <th>住房公积金</th>
                    <th>应发合计</th>
                  </tr>
                </thead>
                <tbody>
                  {['乔大', '张春', '黄博'].map((name, index) => (
                    <tr key={name}>
                      <td>{index + 1}</td>
                      <td>{name}</td>
                      <td>5101211983120{index}08815</td>
                      <td>{index === 2 ? '4500.00' : '5000.00'}</td>
                      <td>{index === 2 ? '367.04' : '0.00'}</td>
                      <td>{index === 2 ? '91.76' : '0.00'}</td>
                      <td>{index === 2 ? '18.35' : '0.00'}</td>
                      <td>{index === 2 ? '4022.85' : '5000.00'}</td>
                    </tr>
                  ))}
                  <tr>
                    <td>合计</td>
                    <td>3人</td>
                    <td>--</td>
                    <td>14500.00</td>
                    <td>367.04</td>
                    <td>91.76</td>
                    <td>18.35</td>
                    <td>14022.85</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="zgy-preview-scroll" />
          </div>
          <aside className="zgy-attachment-info">
            <div className="zgy-info-title">
              <span className="zgy-file-badge">{voucher.attachmentType}</span>
              <strong>{voucher.attachmentName}</strong>
            </div>
            <dl>
              <div>
                <dt>附件类型</dt>
                <dd>{voucher.attachmentType}</dd>
              </div>
              <div>
                <dt>附件名称</dt>
                <dd>{voucher.attachmentName}</dd>
              </div>
              <div>
                <dt>上传日期</dt>
                <dd>{voucher.uploadDate}</dd>
              </div>
            </dl>
            <div className="zgy-upload-rule">
              <b>上传规则</b>
              <p>附件需绑定当前凭证，支持发票、工资表、银行回单、合同、结转测算表等业务佐证材料。</p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function Pagination() {
  return (
    <footer className="zgy-pagination">
      <span>共 40 条</span>
      <button className="zgy-page-size">50条/页 <ChevronDown size={13} /></button>
      <button className="zgy-page-arrow"><ChevronLeft size={14} /></button>
      <button className="zgy-page-current">1</button>
      <button className="zgy-page-arrow"><ChevronRight size={14} /></button>
      <span>前往</span>
      <input value="1" readOnly />
      <span>页</span>
    </footer>
  );
}

const Component = forwardRef(function Voucherlist(_props: AxureProps, ref: React.ForwardedRef<AxureHandle>) {
  const [attachmentVoucher, setAttachmentVoucher] = useState<Voucher | null>(null);

  useImperativeHandle(ref, () => ({
    getVar: () => undefined,
    fireAction: () => {},
    eventList: [],
    actionList: [],
    varList: [],
    configList: [],
    dataList: []
  }), []);

  return (
    <div className="zgy-page" data-chrome-export-root="true">
      <Sidebar />
      <main className="zgy-main">
        <Header />
        <Tabs />
        <section className="zgy-content">
          <Toolbar />
          <VoucherTable onOpenAttachment={setAttachmentVoucher} />
          <Pagination />
        </section>
      </main>
      <div className="zgy-float-avatar"><img src={avatarUrl} alt="客服头像" /></div>
      {attachmentVoucher ? <AttachmentModal voucher={attachmentVoucher} onClose={() => setAttachmentVoucher(null)} /> : null}
    </div>
  );
});

export default Component;
