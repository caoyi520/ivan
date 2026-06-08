/**
 * @name 临时迭代 1.11.1 需求评审工作台
 * @mode axure
 *
 * 参考资料：
 * - https://axhub.im/ax10/35843f63742dfab4/#g=1
 * - /rules/design-guide.md
 * - /rules/development-guide.md
 * - /rules/axure-api-guide.md
 * - /Users/caoyi/.agents/skills/服务商设计规范/SKILL.md
 */

import './style.css';
import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  Filter,
  Layers3,
  MessageSquareText,
  Search,
  Sparkles,
  Workflow
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

type RequirementStatus = '待评审' | '设计确认' | '开发就绪' | '需联调';

type Requirement = {
  id: string;
  theme: string;
  page: string;
  title: string;
  status: RequirementStatus;
  module: string;
  scope: string[];
  summary: string;
  rules: string[];
  acceptance: string[];
  sourceUrl: string;
  referenceImage?: string;
  functionNotes?: Array<{
    title: string;
    items: string[];
  }>;
};

const AXURE_URL = 'https://axhub.im/ax10/35843f63742dfab4/#g=1';

const EVENT_LIST: EventItem[] = [
  { name: 'onRequirementSelect', desc: '点击需求卡片时触发', payload: '当前需求 JSON 字符串' },
  { name: 'onThemeChange', desc: '切换主题时触发', payload: '主题名称' },
  { name: 'onOpenSource', desc: '打开原始 Axure 链接时触发', payload: 'Axure 原型链接' }
];

const ACTION_LIST: Action[] = [
  { name: 'select_requirement', desc: '切换到指定需求', params: '需求 id' },
  { name: 'set_theme', desc: '切换到指定主题', params: '主题名称' },
  { name: 'reset_filters', desc: '重置筛选条件' }
];

const VAR_LIST: KeyDesc[] = [
  { name: 'selected_requirement', desc: '当前选中的需求' },
  { name: 'active_theme', desc: '当前主题筛选' },
  { name: 'visible_count', desc: '筛选后需求数量' }
];

const CONFIG_LIST: ConfigItem[] = [
  { type: 'input', attributeId: 'title', displayName: '页面标题', info: '显示在顶部的标题', initialValue: '临时迭代 1.11.1' },
  { type: 'input', attributeId: 'subtitle', displayName: '页面说明', info: '显示在标题下方的说明', initialValue: '业财税合规&专业生产系统需求评审' }
];

const DATA_LIST: DataDesc[] = [
  {
    name: 'requirements',
    desc: '迭代需求清单',
    keys: [
      { name: 'id', desc: '需求唯一标识' },
      { name: 'theme', desc: '所属主题' },
      { name: 'page', desc: 'Axure 页面标题' },
      { name: 'title', desc: '需求标题' },
      { name: 'status', desc: '评审状态' },
      { name: 'module', desc: '影响模块' },
      { name: 'scope', desc: '影响范围' },
      { name: 'rules', desc: '关键规则' },
      { name: 'acceptance', desc: '验收关注点' },
      { name: 'referenceImage', desc: '参考截图链接' }
    ]
  }
];

const REQUIREMENTS: Requirement[] = [
  {
    id: 'salary-import-trim',
    theme: '1、工资表导入优化',
    page: '1、工资表导入优化',
    title: '工资表姓名前后空格自动忽略',
    status: '开发就绪',
    module: '工资表导入',
    scope: ['会计中心', '生产中心', '记账系统', '财税合规', '合规代账'],
    summary: '工资表导入时，若姓名前后存在空格，系统应忽略空格并允许导入成功。',
    rules: ['支持标准工资表、综合所得申报表、正常工资薪金报表、综合所得预扣预缴明细表。', '仅清理姓名字段前后空格，不改变姓名中间字符。'],
    acceptance: ['姓名前有空格时导入成功。', '姓名后有空格时导入成功。', '导入结果中的姓名应与去除首尾空格后的值一致。'],
    sourceUrl: AXURE_URL
  },
  {
    id: 'tax-confirm-summary',
    theme: '2、国税、个税分别确税',
    page: '会计中心-申报数据汇总',
    title: '申报数据汇总拆分国税/个税确税状态',
    status: '需联调',
    module: '申报数据汇总',
    scope: ['国税整体进度', '个税整体进度', '税费信息', '右侧申报清册'],
    summary: '申报数据汇总列表增加国税、个税确税反馈状态，支持待反馈、待确税、已确认可扣、税款存疑、无需确税等状态。',
    rules: ['国税整体进度列增加国税确税反馈状态。', '个税整体进度列增加个税确税反馈状态。', '当申报成功且应补退税额达到阈值时，状态可从待反馈流转为待确税。', '右侧申报清册展示确税结果、附件信息、备注说明和完税截图。'],
    acceptance: ['不同税种状态应独立展示。', '待确税、税款存疑、无需确税等状态样式可辨识。', '税费合计字段展示国税、个税和合计金额。'],
    functionNotes: [
      {
        title: '批量反馈',
        items: [
          '用户可选择企业批量反馈，二次弹窗确认时按国税、个税分别处理。',
          '批量反馈仅针对申报成功且税额达到反馈条件的税种生效；不满足前置条件时提示仅支持待反馈、税款存疑、已确认可扣等可反馈状态。',
          '若选中企业不存在满足条件的税种，则发起批量反馈时不改变确税反馈状态。'
        ]
      },
      {
        title: '确税状态流转',
        items: [
          '国税整体进度、个税整体进度分别增加确税反馈状态：待反馈、待确税、已确认可扣、税款存疑、无需确税。',
          '待反馈为初始状态；申报成功且至少一个税种达到确税条件，或手动批量反馈成功后，进入待确税。',
          '待确税状态下，顾问或 APP 用户确认可扣后进入已确认可扣；选择税款存疑后进入税款存疑。',
          '申报成功但所有税种无需确税时，状态自动进入无需确税。'
        ]
      },
      {
        title: '右栏与税费信息',
        items: [
          '点击已确认可扣或税款存疑状态时，右栏展示具体完税截图或申报明细附件，支持点击预览或下载。',
          '原“确税信息”列调整为“税费信息”，展示应交国税税费、应交个税税费、应交税费合计。',
          '国税、个税在当前页分别确税；确税完成后对应增值税等日志仍按原规则显示，功能逻辑不变。'
        ]
      },
      {
        title: '历史数据兼容',
        items: [
          '历史数据需按往期国税/个税整体进度和税额状态补充确税反馈状态。',
          '往期数据点击已确认可扣时，右栏无需显示确税详情。'
        ]
      }
    ],
    referenceImage: 'https://axhub.im/ax10/35843f63742dfab4/images/%E4%BC%9A%E8%AE%A1%E4%B8%AD%E5%BF%83-%E7%94%B3%E6%8A%A5%E6%95%B0%E6%8D%AE%E6%B1%87%E6%80%BB/u0.svg',
    sourceUrl: AXURE_URL
  },
  {
    id: 'national-tax-confirm-task',
    theme: '2、国税、个税分别确税',
    page: '【事项】国税税金确认（会计/顾问端）',
    title: '国税税金确认事项',
    status: '设计确认',
    module: '事项中心',
    scope: ['会计端', '顾问端', '国税确税反馈'],
    summary: '国税税金确认事项只展示国税确税反馈状态为待确税的数据，右栏增加完税截图并支持预览。',
    rules: ['列表取消个税整体进度列。', '应发合计字段改为应交国税税费。', '事项状态仅有进行中。', '右栏默认显示第一家企业，提交后切换到下一家。'],
    acceptance: ['仅待确税数据进入事项列表。', '完税截图可点击预览。', '财税合规场景需区分会计端/顾问端过滤规则。'],
    functionNotes: [
      {
        title: '事项页规则',
        items: [
          '页面同原税金确认事项，但列表取消个税整体进度列。',
          '原应发合计字段改为应交国税税费，取当前国税的税费合计。',
          '右栏增加完税截图，显示电子税务局首页截图并支持点击预览。',
          '页面仅显示国税确税反馈状态为待确税的数据，事项状态仅有进行中。',
          '右栏保持原规则：默认显示第一家企业，税金确认后显示下一家企业。'
        ]
      },
      {
        title: '财税合规差异',
        items: [
          '财税合规较合规代账多专家角色。',
          '会计端财税合规数据过滤仅会计；顾问端财税合规数据过滤仅顾问。'
        ]
      }
    ],
    referenceImage: 'https://axhub.im/ax10/35843f63742dfab4/images/%E3%80%90%E4%BA%8B%E9%A1%B9%E3%80%91%E5%9B%BD%E7%A8%8E%E7%A8%8E%E9%87%91%E7%A1%AE%E8%AE%A4%EF%BC%88%E4%BC%9A%E8%AE%A1_%E9%A1%BE%E9%97%AE%E7%AB%AF%EF%BC%89/u0.svg',
    sourceUrl: AXURE_URL
  },
  {
    id: 'personal-tax-confirm-task',
    theme: '2、国税、个税分别确税',
    page: '【事项】个税税金确认（会计/顾问端）',
    title: '个税税金确认事项',
    status: '设计确认',
    module: '事项中心',
    scope: ['会计端', '顾问端', '个税确税反馈', '申报明细附件'],
    summary: '个税税金确认事项只展示个税确税反馈状态为待确税的数据，工资薪金税额后增加申报明细附件下载。',
    rules: ['列表取消国税整体进度列。', '应发合计字段改为应交个税税费。', '工资薪金增加申报明细附件，生产经营暂不增加。', '事项状态仅有进行中。'],
    acceptance: ['仅个税待确税数据进入事项列表。', '申报明细附件可下载。', '提交保存后显示下一家企业。'],
    functionNotes: [
      {
        title: '事项页规则',
        items: [
          '页面同原税金确认事项，但列表取消国税整体进度列。',
          '原应发合计字段改为应交个税税费，取当前个税的税费合计。',
          '右栏在工资薪金税额后增加申报明细附件，支持点击下载；生产经营暂不增加附件。',
          '页面仅显示个税确税反馈状态为待确税的数据，事项状态仅有进行中。',
          '右栏保持原规则：默认显示第一家企业，税金确认后显示下一家企业。'
        ]
      },
      {
        title: '财税合规差异',
        items: [
          '财税合规较合规代账多专家角色。',
          '会计端财税合规数据过滤仅会计；顾问端财税合规数据过滤仅顾问。'
        ]
      }
    ],
    referenceImage: 'https://axhub.im/ax10/35843f63742dfab4/images/%E3%80%90%E4%BA%8B%E9%A1%B9%E3%80%91%E4%B8%AA%E7%A8%8E%E7%A8%8E%E9%87%91%E7%A1%AE%E8%AE%A4%EF%BC%88%E4%BC%9A%E8%AE%A1_%E9%A1%BE%E9%97%AE%E7%AB%AF%EF%BC%89/u0.svg',
    sourceUrl: AXURE_URL
  },
  {
    id: 'ledger-migration-subtotal',
    theme: '3、账套迁移增加【小计】内容',
    page: '3、账套迁移增加【小计】内容',
    title: '账套迁移保留小计备注',
    status: '开发就绪',
    module: '账套迁移',
    scope: ['猪哥云后台', 'ERP-会计中心', '合规平台'],
    summary: '采集猪哥云账套时增加“小计”备注内容数据，并在迁移到 ERP 与合规平台时保留。',
    rules: ['采集阶段读取小计备注。', '迁移阶段将小计内容同步至目标系统。'],
    acceptance: ['迁移前后小计备注内容一致。', '缺失小计时不影响账套迁移流程。'],
    referenceImage: 'https://axhub.im/ax10/35843f63742dfab4/images/3%E3%80%81%E8%B4%A6%E5%A5%97%E8%BF%81%E7%A7%BB%E5%A2%9E%E5%8A%A0%E3%80%90%E5%B0%8F%E8%AE%A1%E3%80%91%E5%86%85%E5%AE%B9/u0.png',
    sourceUrl: AXURE_URL
  },
  {
    id: 'tax-bureau-no-declare',
    theme: '4、电子税务局增加【无需申报】',
    page: '会计中心/生产中心-企业列表',
    title: '电子税务局开通增加无需申报',
    status: '需联调',
    module: '企业电子税务局',
    scope: ['会计中心企业列表', '事项待服务企业完善', '生产中心企业列表', '国税/个税进度页面'],
    summary: '开通或变更电子税务局时新增“申报开通”单选字段，支持需要申报和无需申报。',
    rules: ['默认选中需要申报。', '选择无需申报时隐藏开通字段，提交后开通状态变为无需申报。', '无需申报按开通成功处理业务逻辑。', '历史已开通数据默认回显需要申报。'],
    acceptance: ['新增字段在开通、变更场景均可见。', '无需申报状态联动申报数据汇总、增值税、企业所得税、财务报表等页面。', '生产中心表头筛选增加无需申报项。'],
    functionNotes: [
      {
        title: '申报开通字段',
        items: [
          '开通电子税务局增加“申报开通”字段，单选枚举为需要申报、无需申报。',
          '默认选中需要申报；选择需要申报时显示对应区域和开通字段。',
          '选择无需申报时隐藏所有开通字段，提交后电子税务局开通状态变为无需申报，并按开通成功处理业务逻辑。',
          '变更电子税务局时需回显申报开通字段；历史已开通数据默认选中需要申报。'
        ]
      },
      {
        title: '联动影响',
        items: [
          '申报数据汇总中，无需申报企业的国税整体进度默认无需申报、无需确税、无需缴款。',
          '增值税、企业所得税申报中，无需申报企业的申报进度默认无需准备、无需申报、无需确认、无需缴款。',
          '财务报表、印花税、通用申报、其他申报中，无需申报企业默认无需申报、无需缴款。',
          '生产中心企业列表的电子税务局表头筛选需增加无需申报项。'
        ]
      },
      {
        title: '申报详情检测',
        items: [
          '工资薪金和经营所得申报详情在检测个税扣缴端开通成功后，增加电子税务局开通状态检测项。',
          '若电子税务局开通状态为无需申报，则不继续往下走，功能校验显示无法获取税费种认定，列表申报准备状态变为准备异常。',
          '若电子税务局开通状态非无需申报，则继续按原规则执行。'
        ]
      }
    ],
    referenceImage: 'https://axhub.im/ax10/35843f63742dfab4/images/%E4%BC%9A%E8%AE%A1%E4%B8%AD%E5%BF%83-%E4%BC%81%E4%B8%9A%E5%88%97%E8%A1%A8/u0.png',
    sourceUrl: AXURE_URL
  },
  {
    id: 'tax-bureau-progress-rules',
    theme: '4、电子税务局增加【无需申报】',
    page: '生产中心-国税进度',
    title: '无需申报企业的进度页字段联动',
    status: '需联调',
    module: '国税进度',
    scope: ['国税进度', '极速申报管理', '极速申报明细', '漏报检查'],
    summary: '电子税务局无需申报的企业，在国税进度页展示横杠字段，并限制批量信息验证、申报清册、极速申报操作。',
    rules: ['办税号码、登录方式、信息验证、申报清册、行业、申报状态、缴款状态显示横杠。', '相关表头筛选项增加“无”。', '操作栏显示税务开通与取消开通。', '批量操作遇到无需申报企业时给出阻断提示。'],
    acceptance: ['无需申报企业不进入极速申报管理、极速申报明细、漏报检查页面。', '批量阻断提示带出第一个无需申报企业名称。'],
    functionNotes: [
      {
        title: '生产个税进度',
        items: [
          '电子税务局无需申报企业的工资薪金所得、经营所得税费种认定状态为无状态。',
          '生产中心代扣代缴、生产经营页面需显示税费种认定为无状态的企业，并允许手动申报。'
        ]
      },
      {
        title: '生产国税进度',
        items: [
          '电子税务局增加无需申报筛选项。',
          '无需申报企业的办税号码、登录方式、信息验证、申报清册、国民经济行业、申报状态、缴款状态显示横杠，以上字段筛选项增加无。',
          '无需申报企业的操作栏显示税务开通和取消开通。',
          '批量信息验证、申报清册、开通极速申报遇到无需申报企业时，提示存在企业电子税务局无需申报，暂无法进行该操作。',
          '无需申报企业不在极速申报管理、极速申报明细、漏报检查页面展示。'
        ]
      }
    ],
    referenceImage: 'https://axhub.im/ax10/35843f63742dfab4/images/%E7%94%9F%E4%BA%A7%E4%B8%AD%E5%BF%83-%E5%9B%BD%E7%A8%8E%E8%BF%9B%E5%BA%A6/u0.png',
    sourceUrl: AXURE_URL
  },
  {
    id: 'bookkeeping-tax-social-jump',
    theme: '5、记账系统增加个税、社保申报跳转',
    page: '5、记账系统增加个税、社保申报跳转',
    title: '记账系统新增个税/社保系统入口',
    status: '开发就绪',
    module: '服务商记账系统',
    scope: ['工资记账工具栏', '个税系统', '社保系统'],
    summary: '记账系统新增个税系统和社保系统按钮，并将摘要配置、工资模板、清空、打印合并至更多菜单。',
    rules: ['最终按钮顺序为计提发放、个税系统、社保系统、新增、导入、复制、更多、导出。', '个税系统按当前账期跳转税款所属期。', '社保系统按企业区域决定税款所属期，浙江为当前账期，其他区域为当前账期 + 1。'],
    acceptance: ['未开通个税时显示阻断提示。', '未开通社保时显示阻断提示。', '更多菜单收纳项完整且不改变原功能。'],
    functionNotes: [
      {
        title: '按钮调整',
        items: [
          '服务商记账系统增加个税系统、社保系统功能按钮。',
          '新增更多下拉项，将摘要配置、工资模板、清空、打印合并至更多菜单。',
          '按钮层级为计提发放主级按钮，个税系统和社保系统次级按钮，新增、导入、复制、更多、导出为三级按钮。'
        ]
      },
      {
        title: '个税系统跳转',
        items: [
          '点击个税系统时检测该账套对应企业是否开通个税申报。',
          '未开通时提示当前企业未开通个税申报，暂无法前往个税系统。',
          '已开通时跳转对应个税系统，记账工具当前账期等于个税系统税款所属期。'
        ]
      },
      {
        title: '社保系统跳转',
        items: [
          '点击社保系统时检测该账套对应企业是否开通社保申报。',
          '未开通时提示当前企业未开通社保申报，暂无法前往社保系统。',
          '已开通时按区域跳转：浙江省企业当前账期等于社保系统税款所属期，其他企业当前账期 + 1 等于社保系统税款所属期。'
        ]
      }
    ],
    referenceImage: 'https://axhub.im/ax10/35843f63742dfab4/images/5%E3%80%81%E8%AE%B0%E8%B4%A6%E7%B3%BB%E7%BB%9F%E5%A2%9E%E5%8A%A0%E4%B8%AA%E7%A8%8E%E3%80%81%E7%A4%BE%E4%BF%9D%E7%94%B3%E6%8A%A5%E8%B7%B3%E8%BD%AC/u0.png',
    sourceUrl: AXURE_URL
  },
  {
    id: 'batch-open-tax',
    theme: '6、批量开通国税、个税',
    page: '会计中心/事项/生产中心-企业列表',
    title: '批量开通电子税务局与个税扣缴端',
    status: '设计确认',
    module: '企业批量开通',
    scope: ['会计中心企业列表', '事项待服务企业完善', '生产中心企业列表'],
    summary: '列表页新增批量开通入口，支持批量开通电子税务局与个税扣缴端，提供模板下载和文件导入。',
    rules: ['点击批量开通电子税务局或批量开通个税扣缴端后，右栏显示对应批量导入内容。', '导入以企业账密等信息为输入，通过异步任务批量写入开通。', '电子税务局当前支持新版验证码登录、新版代理机构登录。', '个税扣缴端当前支持个税网报密码登录、实名认证登录。', '导入文件仅限 xls、xlsx，最多 1 个，大小不超过 10MB。'],
    acceptance: ['模板下载入口与导入入口文案清晰。', '不支持的登录方式不可进入批量开通。', '文件类型、数量和大小校验生效。', '提交后企业开通状态应进入开通中，前端无需等待异步任务真正开始。'],
    functionNotes: [
      {
        title: '批量开通电子税务局',
        items: [
          '用户点击“批量开通电子税务局”后，右栏展示对应内容，并以批量导入企业账密信息的方式发起异步开通任务。',
          '右栏步骤包括下载电子税务局批量导入模板、选择申报区域、登录方式及登录信息、上传文件并提交导入。',
          '验证码登录仅填写登录身份、登录身份手机号、自然人登录密码；代理机构登录仅填写代理机构税号、办税员号、自然人登录密码。',
          '系统按文档内企业名称和统一社会信用代码匹配企业，再对电子税务局未开通或开通失败的企业执行开通，匹配成功但不符合条件的企业忽略跳过。',
          '提交后企业电子税务局开通状态变为开通中；由于当前前端暂无任务进度查看页，后端需要进行自动重试。'
        ]
      },
      {
        title: '批量开通个税扣缴端',
        items: [
          '用户点击“批量开通个税扣缴端”后，右栏展示对应内容，并以批量导入企业账密信息的方式发起异步开通任务。',
          '右栏步骤包括下载个税扣缴端批量导入模板、选择申报区域和登录方式、上传文件并提交导入。',
          '个税网报密码登录仅填写个税密码；实名认证登录仅填写实名账号、实名密码。',
          '系统按企业名称和统一社会信用代码匹配企业，再对个税扣缴端未开通或开通失败的企业执行开通，匹配成功但不符合条件的企业忽略跳过。',
          '提交后企业个税扣缴端开通状态变为开通中；若开通中状态被新增，未开通时允许发起，状态变为未开通。'
        ]
      },
      {
        title: '异常场景特殊处理',
        items: [
          '批量导入企业使用新版验证码登录时，若当前不存在批量开通未完成任务，则正常获取验证码；若存在未完成任务，则提示请稍后获取。',
          '个税扣缴端开通中时允许开通状态变为未开通。',
          '个税按任务批量开通时，系统自动校验密码，校验成功后提示请重新开通。'
        ]
      }
    ],
    referenceImage: 'https://axhub.im/ax10/35843f63742dfab4/images/%E4%BC%9A%E8%AE%A1%E4%B8%AD%E5%BF%83-%E4%BC%81%E4%B8%9A%E5%88%97%E8%A1%A8_1/u0.png',
    sourceUrl: AXURE_URL
  },
  {
    id: 'enterprise-count-tabs',
    theme: '7、优化企业数量tab 显示及规则',
    page: '7、优化企业数量tab 显示及规则',
    title: '企业状态 Tab 数量联动筛选',
    status: '开发就绪',
    module: '企业列表 Tab',
    scope: ['全部', '待服务', '服务中'],
    summary: '全部、待服务、服务中 Tab 增加各状态企业数量，并根据当前筛选结果联动变化。',
    rules: ['数量取当前筛选结果，不再使用固定总量。', '筛选条件变化后同步刷新三个 Tab 数量。'],
    acceptance: ['搜索、筛选、状态切换后数量准确。', '数量为 0 时仍展示 Tab，不隐藏入口。'],
    referenceImage: 'https://axhub.im/ax10/35843f63742dfab4/images/7%E3%80%81%E4%BC%98%E5%8C%96%E4%BC%81%E4%B8%9A%E6%95%B0%E9%87%8Ftab_%E6%98%BE%E7%A4%BA%E5%8F%8A%E8%A7%84%E5%88%99/u0.png',
    sourceUrl: AXURE_URL
  },
  {
    id: 'failure-reason-solution',
    theme: '8、失败原因优化',
    page: '8、失败原因优化',
    title: '失败原因隐藏前缀并生成解决方案',
    status: '需联调',
    module: '失败原因提示',
    scope: ['企业管理', '发票管理', '国税管理', '年度申报', '所有电子税务局登录操作页面'],
    summary: '采集、申报等失败原因隐藏系统前缀，并根据关键词生成对应解决方案，未命中时展示通用方案。',
    rules: ['隐藏归集平台异常、外部合作系统返回失败、税局返回失败等前缀。', '保留移入查看失败原因的交互。', '根据关键词生成解决方案。', '未命中文档关键词时展示通用解决方案。'],
    acceptance: ['提示不暴露技术前缀。', '命中关键词时展示专属处理建议。', '未命中时展示通用解决方案。', '性能可控，移入交互不明显卡顿。'],
    functionNotes: [
      {
        title: '展示规则',
        items: [
          '页面隐藏失败原因前缀，包括归集平台异常、外部合作系统结果信息返回失败、税局返回失败、外部合作系统返回失败、外部合作系统返回全部任务状态为失败等。',
          '在原失败原因下通过关键词生成相应解决方案。',
          '文档未覆盖的关键词展示通用解决方案。',
          '在性能可控基础上，交互仍保持移入查看。'
        ]
      },
      {
        title: '涉及页面',
        items: [
          '覆盖所有涉及电子税务局登录操作的页面，主要为生产中心合规代账页面。',
          '包括企业列表、发票采集、勾选抵扣、发票汇总统计、进销检查、国税进度、极速申报管理、极速申报明细、漏报检查、年度申报等失败原因入口。'
        ]
      }
    ],
    referenceImage: 'https://axhub.im/ax10/35843f63742dfab4/images/8%E3%80%81%E5%A4%B1%E8%B4%A5%E5%8E%9F%E5%9B%A0%E4%BC%98%E5%8C%96/u0.png',
    sourceUrl: AXURE_URL
  },
  {
    id: 'remove-customer-assignment',
    theme: '9、取消分配客服按钮',
    page: '会计中心/生产中心-企业列表',
    title: '下架分配客服专员按钮',
    status: '开发就绪',
    module: '企业列表操作栏',
    scope: ['会计中心企业列表', '生产中心企业列表'],
    summary: '下架分配客服专员与快捷分配客服专员按钮，避免入口继续对外暴露。',
    rules: ['会计中心企业列表不再展示分配客服专员。', '生产中心企业列表不再展示快捷分配客服专员。'],
    acceptance: ['入口不可见。', '既有权限配置不应导致按钮残留。'],
    referenceImage: 'https://axhub.im/ax10/35843f63742dfab4/images/%E4%BC%9A%E8%AE%A1%E4%B8%AD%E5%BF%83-%E4%BC%81%E4%B8%9A%E5%88%97%E8%A1%A8_2/u0.png',
    sourceUrl: AXURE_URL
  },
  {
    id: 'compliance-bookkeeping-no-voucher',
    theme: '10、合规记账',
    page: '发票记账/票据记账/工资记账/资金记账',
    title: '合规记账增加无需生成凭证规则',
    status: '需联调',
    module: 'AI 记账',
    scope: ['发票记账', '票据记账', '工资记账', '资金记账'],
    summary: '当业务数据数量为 0 且采集状态已完成时，凭证状态直接为无需生成，不判断准则且不触发 agent。',
    rules: ['销项/进项发票数量为 0 时无需生成。', '无票收入/费用报销数量为 0 时无需生成。', '银行明细数量为 0 时无需生成。', '工资表发放凭证根据 agent 返回标识展示无需生成。'],
    acceptance: ['数量为 0 时不触发 AI 记账。', '数量大于 0 时仍按准则和 agent 流程处理。', '原生成失败场景应正确转为无需生成。'],
    functionNotes: [
      {
        title: '无需生成规则',
        items: [
          '销项发票、进项发票状态为已完成且数量为 0 时，凭证状态直接无需生成，不判断准则且不走 agent。',
          '无票收入、费用报销状态为已完成且数量为 0 时，凭证状态直接无需生成，不判断准则且不走 agent。',
          '银行状态为已完成且银行明细数量为 0 时，凭证状态直接无需生成，不判断准则且不走 agent。',
          '仅当对应数量大于 0 时，才判断准则是否支持并触发 AI 记账。'
        ]
      },
      {
        title: '工资记账规则',
        items: [
          '工资表发放凭证增加无需生成状态。',
          'AI 记账完成时，如果检测到 agent 返回无需生成标识，系统发放凭证直接显示无需生成，原先会显示生成失败。'
        ]
      }
    ],
    referenceImage: 'https://axhub.im/ax10/35843f63742dfab4/images/%E5%8F%91%E7%A5%A8%E8%AE%B0%E8%B4%A6/u0.png',
    sourceUrl: AXURE_URL
  }
];

const STATUS_OPTIONS: Array<'全部' | RequirementStatus> = ['全部', '待评审', '设计确认', '开发就绪', '需联调'];
const THEME_ALL = '全部主题';

function normalizeRequirements(input: unknown): Requirement[] {
  if (!Array.isArray(input)) {
    return REQUIREMENTS;
  }

  const next = input.filter((item): item is Requirement => {
    return Boolean(item && typeof item === 'object' && 'id' in item && 'title' in item);
  });

  return next.length > 0 ? next : REQUIREMENTS;
}

function parseConfigText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function stringifyPayload(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function statusClassName(status: RequirementStatus): string {
  switch (status) {
    case '开发就绪':
      return 'is-ready';
    case '设计确认':
      return 'is-design';
    case '需联调':
      return 'is-integration';
    default:
      return 'is-review';
  }
}

function splitSearchText(requirement: Requirement): string {
  return [
    requirement.title,
    requirement.theme,
    requirement.page,
    requirement.module,
    requirement.summary,
    requirement.scope.join(' '),
    requirement.rules.join(' '),
    requirement.acceptance.join(' ')
  ].join(' ').toLowerCase();
}

const Component = forwardRef<AxureHandle, AxureProps>(function TempIteration1111(innerProps, ref) {
  const dataSource = innerProps && innerProps.data ? innerProps.data : {};
  const configSource = innerProps && innerProps.config ? innerProps.config : {};
  const onEventHandler = typeof innerProps?.onEvent === 'function' ? innerProps.onEvent : function () { return undefined; };

  const title = parseConfigText(configSource.title, '临时迭代 1.11.1');
  const subtitle = parseConfigText(configSource.subtitle, '业财税合规&专业生产系统需求评审');
  const requirements = useMemo(() => normalizeRequirements((dataSource as { requirements?: unknown }).requirements), [dataSource]);

  const [activeTheme, setActiveTheme] = useState(THEME_ALL);
  const [statusFilter, setStatusFilter] = useState<'全部' | RequirementStatus>('全部');
  const [keyword, setKeyword] = useState('');
  const [selectedId, setSelectedId] = useState(requirements[0]?.id || '');

  const themes = useMemo(() => {
    const grouped = requirements.reduce<Record<string, number>>((acc, item) => {
      acc[item.theme] = (acc[item.theme] || 0) + 1;
      return acc;
    }, {});
    return [{ name: THEME_ALL, count: requirements.length }].concat(
      Object.entries(grouped).map(([name, count]) => ({ name, count }))
    );
  }, [requirements]);

  const filteredRequirements = useMemo(() => {
    const lowerKeyword = keyword.trim().toLowerCase();
    return requirements.filter((item) => {
      const themeMatched = activeTheme === THEME_ALL || item.theme === activeTheme;
      const statusMatched = statusFilter === '全部' || item.status === statusFilter;
      const keywordMatched = !lowerKeyword || splitSearchText(item).includes(lowerKeyword);
      return themeMatched && statusMatched && keywordMatched;
    });
  }, [activeTheme, keyword, requirements, statusFilter]);

  const selectedRequirement = useMemo(() => {
    return filteredRequirements.find((item) => item.id === selectedId) || filteredRequirements[0] || requirements[0];
  }, [filteredRequirements, requirements, selectedId]);

  const emitEvent = useCallback((eventName: string, payload?: string) => {
    try {
      onEventHandler(eventName, payload);
    } catch (error) {
      console.warn('事件触发失败:', eventName, error);
    }
  }, [onEventHandler]);

  const handleThemeChange = useCallback((theme: string) => {
    setActiveTheme(theme);
    setSelectedId('');
    emitEvent('onThemeChange', theme);
  }, [emitEvent]);

  const handleRequirementSelect = useCallback((requirement: Requirement) => {
    setSelectedId(requirement.id);
    emitEvent('onRequirementSelect', stringifyPayload(requirement));
  }, [emitEvent]);

  const handleOpenSource = useCallback(() => {
    emitEvent('onOpenSource', AXURE_URL);
    if (typeof window !== 'undefined') {
      window.open(AXURE_URL, '_blank', 'noopener,noreferrer');
    }
  }, [emitEvent]);

  const resetFilters = useCallback(() => {
    setActiveTheme(THEME_ALL);
    setStatusFilter('全部');
    setKeyword('');
    setSelectedId(requirements[0]?.id || '');
  }, [requirements]);

  useImperativeHandle(ref, function () {
    return {
      getVar: function (name: string) {
        const vars: Record<string, unknown> = {
          selected_requirement: selectedRequirement,
          active_theme: activeTheme,
          visible_count: filteredRequirements.length
        };
        return vars[name];
      },
      fireAction: function (name: string, params?: string) {
        switch (name) {
          case 'select_requirement': {
            const target = requirements.find((item) => item.id === params);
            if (target) {
              setSelectedId(target.id);
              setActiveTheme(target.theme);
            }
            break;
          }
          case 'set_theme':
            if (params && themes.some((theme) => theme.name === params)) {
              setActiveTheme(params);
              setSelectedId('');
            }
            break;
          case 'reset_filters':
            resetFilters();
            break;
          default:
            console.warn('未知动作:', name);
        }
      },
      eventList: EVENT_LIST,
      actionList: ACTION_LIST,
      varList: VAR_LIST,
      configList: CONFIG_LIST,
      dataList: DATA_LIST
    };
  }, [activeTheme, filteredRequirements.length, requirements, resetFilters, selectedRequirement, themes]);

  const readyCount = requirements.filter((item) => item.status === '开发就绪').length;
  const integrationCount = requirements.filter((item) => item.status === '需联调').length;
  const imageCount = requirements.filter((item) => item.referenceImage).length;

  return (
    <main className="temp-iteration-shell">
      <aside className="temp-iteration-sidebar" aria-label="迭代主题">
        <div className="temp-iteration-brand">
          <div className="temp-iteration-logo"><Workflow size={20} /></div>
          <div>
            <div className="temp-iteration-brand-title">需求树</div>
            <div className="temp-iteration-brand-sub">Axure 26 页抽取</div>
          </div>
        </div>
        <nav className="temp-iteration-theme-list">
          {themes.map((theme) => (
            <button
              key={theme.name}
              className={`temp-iteration-theme ${activeTheme === theme.name ? 'is-active' : ''}`}
              type="button"
              onClick={() => handleThemeChange(theme.name)}
            >
              <span>{theme.name}</span>
              <strong>{theme.count}</strong>
            </button>
          ))}
        </nav>
      </aside>

      <section className="temp-iteration-main">
        <header className="temp-iteration-header">
          <div>
            <div className="temp-iteration-kicker"><BookOpen size={14} /> PD001 / v1.11.1 / 曹议</div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <button className="temp-iteration-source" type="button" onClick={handleOpenSource}>
            <ArrowUpRight size={16} />
            打开 Axure 原型
          </button>
        </header>

        <section className="temp-iteration-metrics" aria-label="迭代概览">
          <div className="temp-iteration-metric">
            <span>需求项</span>
            <strong>{requirements.length}</strong>
            <small>覆盖 10 个主题</small>
          </div>
          <div className="temp-iteration-metric">
            <span>开发就绪</span>
            <strong>{readyCount}</strong>
            <small>规则明确</small>
          </div>
          <div className="temp-iteration-metric">
            <span>需联调</span>
            <strong>{integrationCount}</strong>
            <small>跨系统影响</small>
          </div>
          <div className="temp-iteration-metric">
            <span>参考截图</span>
            <strong>{imageCount}</strong>
            <small>来自 Axure 页面</small>
          </div>
        </section>

        <section className="temp-iteration-toolbar" aria-label="筛选工具">
          <label className="temp-iteration-search">
            <Search size={16} />
            <input
              aria-label="搜索需求"
              placeholder="搜索标题、页面、规则或影响范围"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </label>
          <div className="temp-iteration-statuses" aria-label="状态筛选">
            <Filter size={15} />
            {STATUS_OPTIONS.map((status) => (
              <button
                key={status}
                className={statusFilter === status ? 'is-active' : ''}
                type="button"
                onClick={() => setStatusFilter(status)}
              >
                {status}
              </button>
            ))}
          </div>
        </section>

        <div className="temp-iteration-content">
          <section className="temp-iteration-list" aria-label="需求列表">
            {filteredRequirements.length === 0 ? (
              <div className="temp-iteration-empty">
                <FileSearch size={34} />
                <strong>没有匹配的需求</strong>
                <span>调整搜索词或状态筛选后再查看。</span>
                <button type="button" onClick={resetFilters}>重置筛选</button>
              </div>
            ) : filteredRequirements.map((requirement) => (
              <button
                key={requirement.id}
                type="button"
                className={`temp-iteration-card ${selectedRequirement?.id === requirement.id ? 'is-selected' : ''}`}
                onClick={() => handleRequirementSelect(requirement)}
              >
                <div className="temp-iteration-card-top">
                  <span className={`temp-iteration-status ${statusClassName(requirement.status)}`}>{requirement.status}</span>
                  <span className="temp-iteration-module">{requirement.module}</span>
                </div>
                <h2>{requirement.title}</h2>
                <p>{requirement.summary}</p>
                <div className="temp-iteration-card-meta">
                  <span><Layers3 size={14} /> {requirement.scope.length} 个影响范围</span>
                  <span><ClipboardCheck size={14} /> {requirement.rules.length} 条规则</span>
                  {requirement.referenceImage ? <span><FileSearch size={14} /> 有截图</span> : null}
                </div>
              </button>
            ))}
          </section>

          {selectedRequirement ? (
            <aside className="temp-iteration-detail" aria-label="需求详情">
              <div className="temp-iteration-detail-head">
                <span className={`temp-iteration-status ${statusClassName(selectedRequirement.status)}`}>{selectedRequirement.status}</span>
                <h2>{selectedRequirement.title}</h2>
                <p>{selectedRequirement.page}</p>
              </div>

              <div className="temp-iteration-panel">
                <h3><Sparkles size={16} /> 需求摘要</h3>
                <p>{selectedRequirement.summary}</p>
              </div>

              <div className="temp-iteration-panel">
                <h3><ClipboardCheck size={16} /> 关键规则</h3>
                <ul>
                  {selectedRequirement.rules.map((rule) => <li key={rule}>{rule}</li>)}
                </ul>
              </div>

              {selectedRequirement.functionNotes ? (
                <div className="temp-iteration-panel temp-iteration-panel--notes">
                  <h3><MessageSquareText size={16} /> 功能说明</h3>
                  {selectedRequirement.functionNotes.map((note) => (
                    <section className="temp-iteration-note-section" key={note.title}>
                      <strong>{note.title}</strong>
                      <ul>
                        {note.items.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </section>
                  ))}
                </div>
              ) : null}

              <div className="temp-iteration-panel">
                <h3><BadgeCheck size={16} /> 验收关注</h3>
                <ul>
                  {selectedRequirement.acceptance.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>

              <div className="temp-iteration-panel">
                <h3><Layers3 size={16} /> 影响范围</h3>
                <div className="temp-iteration-scope-list">
                  {selectedRequirement.scope.map((item) => <span key={item}>{item}</span>)}
                </div>
              </div>

              {selectedRequirement.referenceImage ? (
                <a className="temp-iteration-preview" href={selectedRequirement.referenceImage} target="_blank" rel="noreferrer">
                  <img src={selectedRequirement.referenceImage} alt={`${selectedRequirement.title} Axure 参考截图`} />
                  <span>查看原型截图</span>
                </a>
              ) : null}
            </aside>
          ) : null}
        </div>
      </section>

      <aside className="temp-iteration-review" aria-label="评审协作">
        <div className="temp-iteration-review-card">
          <h2><MessageSquareText size={17} /> 评审提示</h2>
          <div className="temp-iteration-review-item">
            <CheckCircle2 size={16} />
            <span>优先确认“需联调”项的数据流转和跨系统状态口径。</span>
          </div>
          <div className="temp-iteration-review-item">
            <AlertCircle size={16} />
            <span>电子税务局“无需申报”会影响多个申报进度页面，建议单独准备回归用例。</span>
          </div>
          <div className="temp-iteration-review-item">
            <FileSearch size={16} />
            <span>失败原因优化涉及面广，需按关键词命中和未命中两类验证。</span>
          </div>
        </div>
      </aside>
    </main>
  );
});

export default Component;
