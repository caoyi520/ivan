/**
 * @name 企业管理 · 企业列表
 *
 * 参考资料：
 * - 用户提供的企业管理-企业列表.html
 * - /rules/design-guide.md
 * - /rules/development-guide.md
 */

import React from 'react';
import sourceHtml from './source-document.txt?raw';
import './style.css';

export default function EnterpriseManagementList() {
  return (
    <main className="enterprise-management-list">
      <iframe
        className="enterprise-management-list__frame"
        title="企业管理 · 企业列表"
        srcDoc={sourceHtml}
        sandbox="allow-forms allow-scripts"
        referrerPolicy="no-referrer"
      />
    </main>
  );
}
