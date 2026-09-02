import{c as w,b as ce,r as x,j as e,l as pe,G as D,F as M,i as O,e as q,a as xe,d as he,t as j,f as ue,m as V}from"./index-B2Yl4T_k.js";import{f as F,a as k}from"./formatters-BcULkrvN.js";import{C as H}from"./calendar-lkqjakUW.js";import{P as me}from"./paperclip-COQCKwFW.js";import{S as G}from"./shield-alert-Csyk2KDL.js";import{F as ye}from"./file-text-61BUFpw6.js";import{P as fe}from"./printer-BH78z-zz.js";/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const be=w("ArrowDownLeft",[["path",{d:"M17 7 7 17",key:"15tmo1"}],["path",{d:"M17 17H7V7",key:"1org7z"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ge=w("ArrowUpRight",[["path",{d:"M7 7h10v10",key:"1tivn9"}],["path",{d:"M7 17 17 7",key:"1vkiza"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const J=w("ChartNoAxesColumn",[["line",{x1:"18",x2:"18",y1:"20",y2:"10",key:"1xfpm4"}],["line",{x1:"12",x2:"12",y1:"20",y2:"4",key:"be30l9"}],["line",{x1:"6",x2:"6",y1:"20",y2:"14",key:"1r4le6"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ve=w("DollarSign",[["line",{x1:"12",x2:"12",y1:"2",y2:"22",key:"7eqyqh"}],["path",{d:"M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",key:"1b0p4s"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const je=w("Landmark",[["line",{x1:"3",x2:"21",y1:"22",y2:"22",key:"j8o0r"}],["line",{x1:"6",x2:"6",y1:"18",y2:"11",key:"10tf0k"}],["line",{x1:"10",x2:"10",y1:"18",y2:"11",key:"54lgf6"}],["line",{x1:"14",x2:"14",y1:"18",y2:"11",key:"380y"}],["line",{x1:"18",x2:"18",y1:"18",y2:"11",key:"1kevvc"}],["polygon",{points:"12 2 20 7 4 7",key:"jkujk7"}]]),ke="/sky-bbb-logo.png";function Ae(){const{t:s}=ce(),[d,Y]=x.useState(null),[K,A]=x.useState(!0),[a,W]=x.useState("balance"),[u,C]=x.useState(""),[m,L]=x.useState(""),[b,R]=x.useState(""),[g,I]=x.useState(""),[N,P]=x.useState(""),[_,T]=x.useState(""),[v,z]=x.useState(""),[U,Q]=x.useState([]),[E,X]=x.useState([]),[B,Z]=x.useState([]),[p,h]=x.useState([]),[ee,S]=x.useState(!1),te=async()=>{var t,r,l;try{const[i,c,n]=await Promise.allSettled([O.list(),q.list(),xe.listUsers().catch(()=>({data:[]}))]);i.status==="fulfilled"&&Array.isArray((t=i.value)==null?void 0:t.data)&&Q(i.value.data),c.status==="fulfilled"&&Array.isArray((r=c.value)==null?void 0:r.data)&&X(c.value.data),n.status==="fulfilled"&&Array.isArray((l=n.value)==null?void 0:l.data)&&Z(n.value.data)}catch(i){console.error("Failed to load filter drop-downs",i)}},se=async()=>{A(!0);try{const t=await he.getSummary();Y(t.data)}catch(t){console.error(t)}finally{A(!1)}},ae=async()=>{S(!0);try{const t={};if(u&&(t.date_from=u),m&&(t.date_to=m),N&&(t.currency=N),_&&(t.payment_method=_),v&&(t.created_by=v),a==="daily"){const r=new Date().toISOString().split("T")[0];t.date_from=r,t.date_to=r;const l=await j.list(t);h(l.data)}else if(a==="monthly"){const r=new Date,l=new Date(r.getFullYear(),r.getMonth(),1).toISOString().split("T")[0],i=new Date(r.getFullYear(),r.getMonth()+1,0).toISOString().split("T")[0];t.date_from=u||l,t.date_to=m||i;const c=await j.list(t);h(c.data)}else if(a==="received"){t.type="Received";const r=await j.list(t);h(r.data)}else if(a==="paid"){t.type="Paid";const r=await j.list(t);h(r.data)}else if(a==="customer"){if(!b){h([]),S(!1);return}const r=await O.getLedger(b);h(r.data)}else if(a==="bank"){if(!g){h([]),S(!1);return}const r=await q.getLedger(g);h(r.data)}else if(a==="attachments"){const r=await j.list(t);h(r.data.filter(l=>l.attachment_path))}else if(a==="audit"){let l=(await ue.auditLogs()).data;u&&(l=l.filter(i=>i.created_at.split("T")[0]>=u)),m&&(l=l.filter(i=>i.created_at.split("T")[0]<=m)),v&&(l=l.filter(i=>i.user_id===Number(v))),h(l)}else if(a==="currency"){const r=await j.list(t),l=new Map;r.data.forEach(i=>{l.has(i.currency)||l.set(i.currency,{currency:i.currency,count:0,received:0,paid:0,balance:0});const c=l.get(i.currency);c.count+=1,i.type==="Received"?(c.received+=i.amount,c.balance+=i.amount):(c.paid+=i.amount,c.balance-=i.amount)}),h(Array.from(l.values()))}}catch(t){console.error("Failed to generate report:",t)}finally{S(!1)}};x.useEffect(()=>{se(),te()},[]),x.useEffect(()=>{a!=="balance"?ae():h([])},[a,u,m,b,g,N,_,v]);const re=()=>{if(p.length===0)return;let t="data:text/csv;charset=utf-8,",r=[],l=[];a==="customer"||a==="bank"?(r=[s("reports.timestamp"),s("reports.details"),s("reports.total_debit_outflow"),s("reports.total_credit_inflow"),s("reports.vault_net_position")],l=p.map(n=>[n.date,`"${n.description.replace(/"/g,'""')}"`,n.debit,n.credit,n.balance])):a==="currency"?(r=[s("reports.currency"),"Transaction Count","Total Received","Total Paid",s("reports.net_vault")],l=p.map(n=>[n.currency,n.count,n.received,n.paid,n.balance])):a==="audit"?(r=[s("reports.timestamp"),s("reports.action"),"Table Name","Operator ID","Operator Email","Description","IP Address","Device Agent"],l=p.map(n=>[n.created_at,n.action,n.table_name,n.user_id,n.user_email||"System",`"${n.description.replace(/"/g,'""')}"`,n.ip_address||"N/A",`"${(n.device_info||"N/A").replace(/"/g,'""')}"`])):(r=[s("reports.receipt_no"),"Date",s("reports.customer"),"Bank Account ID",s("reports.type"),s("reports.amount"),s("reports.currency"),s("reports.eq_usd"),s("reports.method"),"Notes"],l=p.map(n=>[n.receipt_no,n.date,n.customer_name,n.bank_account_id,n.type,n.amount,n.currency,n.equivalent_amount,n.payment_method,`"${(n.notes||"").replace(/"/g,'""')}"`])),t+=r.join(",")+`
`+l.map(n=>n.join(",")).join(`
`);const i=encodeURI(t),c=document.createElement("a");c.setAttribute("href",i),c.setAttribute("download",`sky-banking-report-${a}-${Date.now()}.csv`),document.body.appendChild(c),c.click(),c.remove()},oe=async()=>{try{await V.exportExcel(`sky-ariana-balam-bar-baran-database-${Date.now()}.csv`)}catch(t){console.error(t),alert("Failed to export the database CSV.")}},ne=async()=>{try{await V.exportPDF(`sky-ariana-balam-bar-baran-journal-${Date.now()}.pdf`)}catch(t){console.error(t),alert("Failed to export the PDF journal.")}},le=()=>{const t=window.open("","_blank");if(!t)return;let r="Financial Statement",l=`Generated on ${new Date().toLocaleDateString()}`;if(u&&(l+=` | From: ${u}`),m&&(l+=` | To: ${m}`),a==="daily")r="Daily Transaction Journal";else if(a==="monthly")r="Monthly Financial Ledger";else if(a==="received")r="Cash / Transfers Inflow Journal";else if(a==="paid")r="Payments & Outflows Journal";else if(a==="customer"){const o=U.find(f=>f.id===Number(b));r=`Customer Ledger Statement: ${(o==null?void 0:o.name)||s("reports.customer")}`}else if(a==="bank"){const o=E.find(f=>f.id===Number(g));r=`Bank Vault Statement: ${(o==null?void 0:o.account_name)||"Account"}`}else a==="currency"?r="Currency Vault Balances":a==="attachments"?r="Receipt Attachment Tracking Statement":a==="audit"&&(r="System Activity Audit Trail");let i="",c="";a==="customer"||a==="bank"?(i=`
        <th>Date</th>
        <th>Description</th>
        <th style="text-align: right;">Debit (Outflow)</th>
        <th style="text-align: right;">Credit (Inflow)</th>
        <th style="text-align: right;">Running Balance</th>
      `,c=p.map(o=>`
        <tr>
          <td>${escapeHtml(k(o.date))}</td>
          <td>${o.description}</td>
          <td style="text-align: right;">${o.debit>0?o.debit.toLocaleString(void 0,{minimumFractionDigits:2}):"-"}</td>
          <td style="text-align: right;">${o.credit>0?o.credit.toLocaleString(void 0,{minimumFractionDigits:2}):"-"}</td>
          <td style="text-align: right; font-weight: bold;">${o.balance.toLocaleString(void 0,{minimumFractionDigits:2})}</td>
        </tr>
      `).join("")):a==="currency"?(i=`
        <th>{t('reports.currency')}</th>
        <th style="text-align: center;">{t('reports.tx_count')}</th>
        <th style="text-align: right;">{t('reports.total_inflows')}</th>
        <th style="text-align: right;">{t('reports.total_outflows')}</th>
        <th style="text-align: right;">{t('reports.net_vault')}</th>
      `,c=p.map(o=>`
        <tr>
          <td style="font-weight: bold; color: #0369a1;">${o.currency}</td>
          <td style="text-align: center;">${o.count}</td>
          <td style="text-align: right; color: #10b981;">${o.received.toLocaleString(void 0,{minimumFractionDigits:2})}</td>
          <td style="text-align: right; color: #ef4444;">${o.paid.toLocaleString(void 0,{minimumFractionDigits:2})}</td>
          <td style="text-align: right; font-weight: bold; color: ${o.balance>=0?"#10b981":"#ef4444"};">
            ${o.balance.toLocaleString(void 0,{minimumFractionDigits:2})}
          </td>
        </tr>
      `).join("")):a==="audit"?(i=`
        <th>{t('reports.timestamp')}</th>
        <th>{t('reports.action')}</th>
        <th>{t('reports.operator')}</th>
        <th>Description</th>
        <th>{t('reports.ip_network_col')}</th>
      `,c=p.map(o=>`
        <tr>
          <td>${k(o.created_at)}</td>
          <td style="font-weight: bold; text-transform: uppercase;">${o.action}</td>
          <td>${escapeHtml(o.user_email||"System")}</td>
          <td>${o.description}</td>
          <td style="font-family: monospace; font-size: 10px;">${o.ip_address||"Localhost"}</td>
        </tr>
      `).join("")):(i=`
        <th>{t('reports.receipt_no')}</th>
        <th>Date</th>
        <th>{t('reports.cust_name')}</th>
        <th>{t('reports.method')}</th>
        <th>{t('reports.type')}</th>
        <th style="text-align: right;">{t('reports.amount')}</th>
        <th style="text-align: right;">{t('reports.eq_usd')}</th>
      `,c=p.map(o=>`
        <tr>
          <td style="font-weight: bold; font-family: monospace;">${o.receipt_no}</td>
          <td>${k(o.date)}</td>
          <td>${o.customer_name}</td>
          <td>${o.payment_method}</td>
          <td style="font-weight: bold; color: ${o.type==="Received"?"#10b981":"#ef4444"};">${o.type}</td>
          <td style="text-align: right; font-weight: bold;">${o.amount.toLocaleString(void 0,{minimumFractionDigits:2})} ${o.currency}</td>
          <td style="text-align: right; color: #64748b;">${o.equivalent_amount.toLocaleString(void 0,{minimumFractionDigits:2})} USD</td>
        </tr>
      `).join(""));let n="";if(a!=="currency"&&a!=="audit"){const o=p.reduce(($,y)=>$+((y.type==="Received"||y.credit>0)&&(y.equivalent_amount||y.credit)||0),0),f=p.reduce(($,y)=>$+((y.type==="Paid"||y.debit>0)&&(y.equivalent_amount||y.debit)||0),0);n=`
        <div style="margin: 25px 0; padding: 15px; border: 1.5px solid #0284c7; background-color: #f0f9ff; border-radius: 8px; display: flex; justify-content: space-around; font-family: 'Segoe UI', Arial, sans-serif;">
          <div><strong style="color: #0284c7; font-size: 11px; text-transform: uppercase;">{t('reports.total_cr_usd')}</strong><div style="font-size: 18px; font-weight: 850; color: #1e3a8a; margin-top: 4px;">$${o.toLocaleString(void 0,{minimumFractionDigits:2})}</div></div>
          <div style="border-left: 1px solid #bae6fd;"></div>
          <div><strong style="color: #0284c7; font-size: 11px; text-transform: uppercase;">{t('reports.total_db_usd')}</strong><div style="font-size: 18px; font-weight: 850; color: #1e3a8a; margin-top: 4px;">$${f.toLocaleString(void 0,{minimumFractionDigits:2})}</div></div>
          <div style="border-left: 1px solid #bae6fd;"></div>
          <div><strong style="color: #0284c7; font-size: 11px; text-transform: uppercase;">{t('reports.net_bal_usd')}</strong><div style="font-size: 18px; font-weight: 850; color: ${o-f>=0?"#10b981":"#ef4444"}; margin-top: 4px;">$${(o-f).toLocaleString(void 0,{minimumFractionDigits:2})}</div></div>
        </div>
      `}const de=`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${r}</title>
        <style>
          @media print {
            body { margin: 15mm 15mm 15mm 15mm; -webkit-print-color-adjust: exact; }
            .no-print { display: none; }
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #0f172a;
            font-size: 12px;
            line-height: 1.4;
            padding: 20px;
          }
          header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0284c7;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          .title-area h1 {
            font-size: 20px;
            font-weight: 900;
            color: #1e3a8a;
            margin: 0;
          }
          .brand-lockup {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .brand-logo {
            width: 76px;
            height: 52px;
            border: 1px solid #dbeafe;
            border-radius: 12px;
            object-fit: contain;
            padding: 4px;
            background: #fff;
          }
          .title-area p {
            color: #0284c7;
            font-size: 10px;
            font-weight: bold;
            margin: 3px 0 0 0;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .meta-area {
            text-align: right;
            font-size: 10px;
            font-weight: bold;
            color: #64748b;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }
          th {
            background-color: #f1f5f9;
            color: #1e3a8a;
            font-weight: bold;
            font-size: 10px;
            text-transform: uppercase;
            padding: 8px 10px;
            border-bottom: 2px solid #cbd5e1;
            text-align: left;
          }
          td {
            padding: 8px 10px;
            border-bottom: 1px solid #e2e8f0;
          }
          .signatures {
            margin-top: 60px;
            display: flex;
            justify-content: space-between;
          }
          .sig-box {
            width: 200px;
            border-top: 1px dashed #94a3b8;
            padding-top: 8px;
            text-align: center;
            font-size: 10px;
            font-weight: bold;
            color: #475569;
          }
          .btn-print {
            background-color: #0284c7;
            color: #fff;
            border: none;
            padding: 8px 16px;
            font-size: 11px;
            font-weight: bold;
            border-radius: 6px;
            cursor: pointer;
            margin-bottom: 20px;
          }
          .btn-print:hover { background-color: #0369a1; }
        </style>
      </head>
      <body>
        <div class="no-print">
          <button class="btn-print" onclick="window.print()">{t('reports.print_this')}</button>
        </div>
        <header>
          <div class="brand-lockup">
            <img class="brand-logo" src="${ke}" alt={t('reports.company_name')} />
            <div class="title-area">
              <h1>{t('reports.company_name')}</h1>
              <p>${r}</p>
            </div>
          </div>
          <div class="meta-area">
            <div>${l}</div>
            <div style="margin-top: 4px;">{t('reports.company_desc')}</div>
          </div>
        </header>
        
        ${n}

        <table>
          <thead>
            <tr>${i}</tr>
          </thead>
          <tbody>
            ${c}
          </tbody>
        </table>

        <div class="signatures">
          <div class="sig-box">{t('reports.prepared_by')}</div>
          <div class="sig-box">{t('reports.verified_by')}</div>
          <div class="sig-box">{t('reports.signature')}</div>
        </div>
      </body>
      </html>
    `;t.document.write(de),t.document.close()},ie=t=>{W(t),C(""),L(""),R(""),I(""),P(""),T(""),z(""),h([])};return e.jsxs("div",{className:"space-y-6",children:[e.jsx("div",{className:"flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4",children:e.jsxs("div",{children:[e.jsx("h1",{className:"text-2xl font-black text-sky-900 leading-tight",children:s("reports.title")}),e.jsx("p",{className:"text-sm text-sky-500 font-medium mt-1",children:s("reports.subtitle")})]})}),e.jsx("div",{className:"flex flex-wrap gap-2 border-b border-sky-100 pb-3",children:[{id:"balance",label:"Vault Net Position",icon:J},{id:"daily",label:"Daily Journal",icon:H},{id:"monthly",label:"Monthly Ledger",icon:H},{id:"customer",label:"Customer Statement",icon:pe},{id:"bank",label:"Bank Statement",icon:je},{id:"currency",label:"Currency Vaults",icon:ve},{id:"received",label:"Inflow (Received)",icon:be},{id:"paid",label:"Outflow (Paid)",icon:ge},{id:"attachments",label:"Attachments Tracker",icon:me},{id:"audit",label:"User Activity Trail",icon:G}].map(t=>{const r=t.icon;return e.jsxs("button",{onClick:()=>ie(t.id),className:`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${a===t.id?"bg-sky-500 text-white shadow-md":"bg-white/60 text-sky-800 hover:bg-sky-50 border border-sky-50"}`,children:[e.jsx(r,{size:13}),e.jsx("span",{children:t.label})]},t.id)})}),a==="balance"?K?e.jsx("div",{className:"py-20 flex justify-center",children:e.jsx("div",{className:"w-12 h-12 rounded-full border-4 border-sky-200 border-t-sky-500 animate-spin"})}):e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-3 gap-6",children:[e.jsx(D,{className:"lg:col-span-2 p-6 flex flex-col justify-between",children:e.jsxs("div",{children:[e.jsxs("h2",{className:"text-base font-extrabold text-sky-900 border-b border-sky-100 pb-3 mb-5 flex items-center gap-2",children:[e.jsx(J,{size:18,className:"text-sky-500"}),e.jsx("span",{children:s("reports.profit_volume_summary")})]}),e.jsxs("div",{className:"space-y-5",children:[e.jsxs("div",{children:[e.jsxs("div",{className:"flex justify-between text-xs font-bold text-sky-900 mb-1",children:[e.jsx("span",{children:s("reports.total_credit_inflow")}),e.jsx("span",{className:"text-emerald-600",children:F((d==null?void 0:d.total_received)||0,"USD")})]}),e.jsx("div",{className:"w-full bg-sky-100 h-2.5 rounded-full overflow-hidden",children:e.jsx("div",{className:"bg-emerald-500 h-full rounded-full",style:{width:"100%"}})})]}),e.jsxs("div",{children:[e.jsxs("div",{className:"flex justify-between text-xs font-bold text-sky-900 mb-1",children:[e.jsx("span",{children:s("reports.total_debit_outflow")}),e.jsx("span",{className:"text-rose-600",children:F((d==null?void 0:d.total_paid)||0,"USD")})]}),e.jsx("div",{className:"w-full bg-sky-100 h-2.5 rounded-full overflow-hidden",children:e.jsx("div",{className:"bg-rose-500 h-full rounded-full",style:{width:`${(d==null?void 0:d.total_paid)/((d==null?void 0:d.total_received)||1)*100}%`}})})]}),e.jsxs("div",{children:[e.jsxs("div",{className:"flex justify-between text-xs font-bold text-sky-900 mb-1",children:[e.jsx("span",{children:s("reports.vault_net_position")}),e.jsx("span",{className:(d==null?void 0:d.total_balance)>=0?"text-emerald-600 font-black":"text-rose-600 font-black",children:F((d==null?void 0:d.total_balance)||0,"USD")})]}),e.jsx("div",{className:"w-full bg-sky-100 h-2.5 rounded-full overflow-hidden",children:e.jsx("div",{className:"bg-sky-500 h-full rounded-full",style:{width:`${(d==null?void 0:d.total_balance)/((d==null?void 0:d.total_received)||1)*100}%`}})})]})]})]})}),e.jsx(D,{className:"p-6 flex flex-col justify-between",children:e.jsxs("div",{children:[e.jsx("h2",{className:"text-base font-extrabold text-sky-900 border-b border-sky-100 pb-3 mb-4",children:"Full Database Export"}),e.jsx("p",{className:"text-xs text-sky-500 font-semibold leading-relaxed mb-6",children:"Extract and download the complete raw database archives."}),e.jsxs("div",{className:"space-y-3",children:[e.jsxs("button",{type:"button",onClick:oe,className:"w-full py-3 bg-gradient-to-tr from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold rounded-xl shadow-md transition-all text-xs flex items-center justify-center gap-2",children:[e.jsx(M,{size:14}),e.jsx("span",{children:s("reports.download_excel")})]}),e.jsxs("button",{type:"button",onClick:ne,className:"w-full py-3 border border-sky-100 bg-white hover:bg-sky-50 text-sky-800 font-bold rounded-xl shadow-sm transition-all text-xs flex items-center justify-center gap-2",children:[e.jsx(ye,{size:14}),e.jsx("span",{children:s("reports.download_pdf")})]})]})]})})]}):e.jsxs("div",{className:"space-y-6",children:[e.jsxs(D,{className:"p-5",children:[e.jsx("h3",{className:"text-xs font-black text-sky-900 uppercase tracking-wider mb-4",children:s("reports.report_filters")}),e.jsxs("div",{className:"grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-bold text-sky-500 uppercase tracking-wider mb-1.5",children:s("reports.date_from")}),e.jsx("input",{type:"date",value:u,onChange:t=>C(t.target.value),className:"w-full px-3 py-2 border border-sky-100 bg-white rounded-xl text-xs text-sky-900 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-200"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-bold text-sky-500 uppercase tracking-wider mb-1.5",children:s("reports.date_to")}),e.jsx("input",{type:"date",value:m,onChange:t=>L(t.target.value),className:"w-full px-3 py-2 border border-sky-100 bg-white rounded-xl text-xs text-sky-900 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-200"})]}),a==="customer"&&e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-bold text-sky-500 uppercase tracking-wider mb-1.5",children:s("reports.customer_acc")}),e.jsxs("select",{value:b,onChange:t=>R(t.target.value),className:"w-full px-3 py-2 border border-sky-100 bg-white rounded-xl text-xs text-sky-900 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-200",children:[e.jsx("option",{value:"",children:s("reports.choose_customer")}),U.map(t=>e.jsx("option",{value:t.id,children:t.name},t.id))]})]}),a==="bank"&&e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-bold text-sky-500 uppercase tracking-wider mb-1.5",children:s("reports.bank_vault_acc")}),e.jsxs("select",{value:g,onChange:t=>I(t.target.value),className:"w-full px-3 py-2 border border-sky-100 bg-white rounded-xl text-xs text-sky-900 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-200",children:[e.jsx("option",{value:"",children:s("reports.choose_bank_acc")}),E.map(t=>e.jsxs("option",{value:t.id,children:[t.account_name," (",t.currency,")"]},t.id))]})]}),a!=="customer"&&a!=="bank"&&a!=="currency"&&a!=="audit"&&e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-bold text-sky-500 uppercase tracking-wider mb-1.5",children:s("reports.currency")}),e.jsxs("select",{value:N,onChange:t=>P(t.target.value),className:"w-full px-3 py-2 border border-sky-100 bg-white rounded-xl text-xs text-sky-900 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-200",children:[e.jsx("option",{value:"",children:s("reports.all_currencies")}),e.jsx("option",{value:"USD",children:"USD"}),e.jsx("option",{value:"EUR",children:"EUR"}),e.jsx("option",{value:"AED",children:"AED"}),e.jsx("option",{value:"AFN",children:"AFN"}),e.jsx("option",{value:"IRR",children:"IRR (Toman)"}),e.jsx("option",{value:"PKR",children:"PKR"})]})]}),a!=="customer"&&a!=="bank"&&a!=="currency"&&a!=="audit"&&e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-bold text-sky-500 uppercase tracking-wider mb-1.5",children:s("reports.payment_method")}),e.jsxs("select",{value:_,onChange:t=>T(t.target.value),className:"w-full px-3 py-2 border border-sky-100 bg-white rounded-xl text-xs text-sky-900 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-200",children:[e.jsx("option",{value:"",children:s("reports.all_methods")}),e.jsx("option",{value:s("reports.cash"),children:s("reports.cash")}),e.jsx("option",{value:s("reports.bank_transfer"),children:s("reports.bank_transfer")}),e.jsx("option",{value:"Hawala",children:s("reports.hawala")})]})]}),(a==="audit"||a!=="customer"&&a!=="bank"&&a!=="currency")&&B.length>0&&e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-bold text-sky-500 uppercase tracking-wider mb-1.5",children:s("reports.created_by_op")}),e.jsxs("select",{value:v,onChange:t=>z(t.target.value),className:"w-full px-3 py-2 border border-sky-100 bg-white rounded-xl text-xs text-sky-900 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-200",children:[e.jsx("option",{value:"",children:s("reports.all_operators")}),B.map(t=>e.jsx("option",{value:t.id,children:t.email},t.id))]})]})]})]}),e.jsxs("div",{className:"flex flex-col sm:flex-row items-center justify-between gap-4",children:[e.jsxs("h3",{className:"text-sm font-extrabold text-sky-900",children:["Filtered Records (",p.length," entries found)"]}),e.jsxs("div",{className:"flex items-center gap-2 w-full sm:w-auto",children:[e.jsxs("button",{onClick:le,disabled:p.length===0,className:"flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 border border-sky-100 bg-white hover:bg-sky-50 text-sky-800 font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50",children:[e.jsx(fe,{size:13}),e.jsx("span",{children:s("reports.print_statement")})]}),e.jsxs("button",{onClick:re,disabled:p.length===0,className:"flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50",children:[e.jsx(M,{size:13}),e.jsx("span",{children:s("reports.export_csv")})]})]})]}),e.jsx(D,{className:"p-6",children:ee?e.jsx("div",{className:"py-20 flex justify-center",children:e.jsx(Loader2,{className:"animate-spin text-sky-500",size:28})}):p.length===0?e.jsxs("div",{className:"py-16 text-center",children:[e.jsx(G,{size:28,className:"text-sky-300 mx-auto mb-2"}),e.jsx("p",{className:"text-xs text-sky-400 font-semibold",children:a==="customer"&&!b?"Please select a customer to display statement ledger.":a==="bank"&&!g?"Please select a bank account to display statement ledger.":"No transaction entries matched current filters."})]}):e.jsx("div",{className:"overflow-x-auto",children:e.jsxs("table",{className:"w-full border-collapse text-left text-xs",children:[e.jsx("thead",{children:e.jsx("tr",{className:"border-b border-sky-100 text-[10px] uppercase font-bold text-sky-400 tracking-wider",children:a==="customer"||a==="bank"?e.jsxs(e.Fragment,{children:[e.jsx("th",{className:"py-3 pr-4",children:"Date"}),e.jsx("th",{className:"py-3 px-4",children:"Description"}),e.jsx("th",{className:"py-3 px-4 text-right",children:"Debit (Outflow)"}),e.jsx("th",{className:"py-3 px-4 text-right",children:"Credit (Inflow)"}),e.jsx("th",{className:"py-3 pl-4 text-right",children:"Running Balance"})]}):a==="currency"?e.jsxs(e.Fragment,{children:[e.jsx("th",{className:"py-3 pr-4",children:s("reports.currency")}),e.jsx("th",{className:"py-3 px-4 text-center",children:s("reports.tx_count")}),e.jsx("th",{className:"py-3 px-4 text-right",children:s("reports.total_inflow")}),e.jsx("th",{className:"py-3 px-4 text-right",children:s("reports.total_outflow")}),e.jsx("th",{className:"py-3 pl-4 text-right",children:s("reports.net_vault")})]}):a==="audit"?e.jsxs(e.Fragment,{children:[e.jsx("th",{className:"py-3 pr-4",children:s("reports.timestamp")}),e.jsx("th",{className:"py-3 px-4",children:s("reports.action")}),e.jsx("th",{className:"py-3 px-4",children:s("reports.operator")}),e.jsx("th",{className:"py-3 px-4",children:s("reports.details")}),e.jsx("th",{className:"py-3 pl-4",children:s("reports.ip_network")})]}):e.jsxs(e.Fragment,{children:[e.jsx("th",{className:"py-3 pr-4",children:s("reports.receipt_no")}),e.jsx("th",{className:"py-3 px-4",children:"Date"}),e.jsx("th",{className:"py-3 px-4",children:s("reports.customer")}),e.jsx("th",{className:"py-3 px-4",children:s("reports.method")}),e.jsx("th",{className:"py-3 px-4",children:s("reports.type")}),e.jsx("th",{className:"py-3 px-4 text-right",children:s("reports.amount")}),e.jsx("th",{className:"py-3 pl-4 text-right",children:s("reports.eq_usd")})]})})}),e.jsx("tbody",{className:"divide-y divide-sky-50/50",children:a==="customer"||a==="bank"?p.map(t=>e.jsxs("tr",{className:"hover:bg-sky-50/30 transition-colors",children:[e.jsx("td",{className:"py-3 pr-4 text-sky-500 font-medium whitespace-nowrap",children:k(t.date)}),e.jsx("td",{className:"py-3 px-4 text-sky-900 font-semibold",children:t.description}),e.jsx("td",{className:"py-3 px-4 text-right text-rose-600 font-mono font-bold",children:t.debit>0?t.debit.toLocaleString(void 0,{minimumFractionDigits:2}):"-"}),e.jsx("td",{className:"py-3 px-4 text-right text-emerald-600 font-mono font-bold",children:t.credit>0?t.credit.toLocaleString(void 0,{minimumFractionDigits:2}):"-"}),e.jsx("td",{className:"py-3 pl-4 text-right text-sky-900 font-mono font-extrabold",children:t.balance.toLocaleString(void 0,{minimumFractionDigits:2})})]},t.id)):a==="currency"?p.map((t,r)=>e.jsxs("tr",{className:"hover:bg-sky-50/30 transition-colors",children:[e.jsx("td",{className:"py-3 pr-4 text-sky-850 font-black text-sm",children:t.currency}),e.jsx("td",{className:"py-3 px-4 text-center text-sky-500 font-bold",children:t.count}),e.jsx("td",{className:"py-3 px-4 text-right text-emerald-600 font-mono font-bold",children:t.received.toLocaleString(void 0,{minimumFractionDigits:2})}),e.jsx("td",{className:"py-3 px-4 text-right text-rose-600 font-mono font-bold",children:t.paid.toLocaleString(void 0,{minimumFractionDigits:2})}),e.jsx("td",{className:`py-3 pl-4 text-right font-mono font-black ${t.balance>=0?"text-emerald-600":"text-rose-600"}`,children:t.balance.toLocaleString(void 0,{minimumFractionDigits:2})})]},r)):a==="audit"?p.map(t=>e.jsxs("tr",{className:"hover:bg-sky-50/30 transition-colors text-[11px]",children:[e.jsx("td",{className:"py-3 pr-4 text-sky-500 whitespace-nowrap",children:k(t.created_at)}),e.jsx("td",{className:"py-3 px-4 whitespace-nowrap",children:e.jsx("span",{className:"px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-100 text-[9px] font-bold uppercase",children:t.action})}),e.jsx("td",{className:"py-3 px-4 font-bold text-sky-800 whitespace-nowrap",children:t.user_email||"System"}),e.jsx("td",{className:"py-3 px-4 text-sky-700 font-medium",children:t.description}),e.jsx("td",{className:"py-3 pl-4 font-mono text-sky-400 whitespace-nowrap",children:t.ip_address||"Localhost"})]},t.id)):p.map(t=>e.jsxs("tr",{className:"hover:bg-sky-50/30 transition-colors",children:[e.jsx("td",{className:"py-3 pr-4 text-sky-900 font-black font-mono whitespace-nowrap",children:t.receipt_no}),e.jsx("td",{className:"py-3 px-4 text-sky-500 whitespace-nowrap",children:k(t.date)}),e.jsx("td",{className:"py-3 px-4 text-sky-800 font-bold max-w-[150px] truncate",children:t.customer_name}),e.jsx("td",{className:"py-3 px-4 text-sky-600 font-medium whitespace-nowrap",children:t.payment_method}),e.jsx("td",{className:"py-3 px-4 whitespace-nowrap",children:e.jsx("span",{className:`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${t.type==="Received"?"bg-emerald-50 text-emerald-600 border border-emerald-100":"bg-rose-50 text-rose-600 border border-rose-100"}`,children:t.type})}),e.jsxs("td",{className:"py-3 px-4 text-right text-sky-900 font-mono font-bold whitespace-nowrap",children:[t.amount.toLocaleString(void 0,{minimumFractionDigits:2})," ",t.currency]}),e.jsxs("td",{className:"py-3 pl-4 text-right text-sky-400 font-mono whitespace-nowrap",children:[t.equivalent_amount.toLocaleString(void 0,{minimumFractionDigits:2})," USD"]})]},t.id))})]})})})]})]})}export{Ae as default};
