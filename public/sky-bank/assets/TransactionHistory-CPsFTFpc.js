import{c as he,b as ge,r as d,u as ye,e as ve,j as t,F as ke,G as K,t as j}from"./index-B2Yl4T_k.js";import{a as D,f as p}from"./formatters-BcULkrvN.js";import{P as H}from"./printer-BH78z-zz.js";import{S as we}from"./search-BYyQkVcU.js";import{L as N}from"./loader-circle-CPeIJ8P6.js";import{P as _}from"./paperclip-COQCKwFW.js";import{E as Q}from"./eye-DfqyHcae.js";import{D as X}from"./download-BiycWtSs.js";import{P as Z}from"./pen-DmTJgC1K.js";import{T as $}from"./trash-2-BO8DdEH2.js";/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const je=he("SlidersHorizontal",[["line",{x1:"21",x2:"14",y1:"4",y2:"4",key:"obuewd"}],["line",{x1:"10",x2:"3",y1:"4",y2:"4",key:"1q6298"}],["line",{x1:"21",x2:"12",y1:"12",y2:"12",key:"1iu8h1"}],["line",{x1:"8",x2:"3",y1:"12",y2:"12",key:"ntss68"}],["line",{x1:"21",x2:"16",y1:"20",y2:"20",key:"14d8ph"}],["line",{x1:"12",x2:"3",y1:"20",y2:"20",key:"m0wm8r"}],["line",{x1:"14",x2:"14",y1:"2",y2:"6",key:"14e1ph"}],["line",{x1:"8",x2:"8",y1:"10",y2:"14",key:"1i6ji0"}],["line",{x1:"16",x2:"16",y1:"18",y2:"22",key:"1lctlv"}]]),h="Sky Ariana Limited",ee="Money Transaction & Hawala Receipt Management System",te="/sky-bbb-logo.png",Ne=["USD","Toman","Dirham","Afghani"],_e=["Bank Transfer","Cash","Hawala"],$e=["Completed","Pending","Cancelled"],se={customer:"",currency:"",bank_account_id:"",payment_method:"",status:"",date_from:"",date_to:"",amount_min:"",amount_max:""},Ce=s=>`"${String(s??"").replace(/"/g,'""')}"`,i=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"),ae=s=>String(s||"transaction-archive").trim().replace(/[^\w.-]+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"").toLowerCase(),ze=(s,v)=>{var g,u,c,k;return((u=(g=s==null?void 0:s.response)==null?void 0:g.data)==null?void 0:u.detail)||((k=(c=s==null?void 0:s.response)==null?void 0:c.data)==null?void 0:k.message)||(s==null?void 0:s.message)||v};function Le(){const{t:s}=ge(),v=JSON.parse(localStorage.getItem("sky_banking_user")||"{}"),g=v.role==="Admin",u=v.role==="Viewer",[c,k]=d.useState([]),[C,ie]=d.useState([]),[ne,R]=d.useState(!0),[T,le]=d.useState(!1),[n,q]=d.useState(se),[b,z]=d.useState(null),[l,E]=d.useState(null),[P,F]=d.useState(null),L=d.useRef(null),[I,M]=d.useState(null),[re,B]=d.useState(!1),x=ye(),O=(e,a)=>{F({type:e,message:a}),window.setTimeout(()=>F(null),3500)},S=async()=>{R(!0);try{const e=Object.fromEntries(Object.entries(n).filter(([r,f])=>f)),a=await j.list(e);k(a.data)}catch(e){console.error("Failed to fetch transactions",e)}finally{R(!1)}};d.useEffect(()=>{ve.list().then(e=>ie(e.data)).catch(e=>console.error(e))},[]),d.useEffect(()=>{S()},[n]);const A=d.useMemo(()=>c.reduce((e,a)=>{const r=Number(a.amount||0);return a.type==="Received"?e.received+=r:e.paid+=r,e.count+=1,e},{received:0,paid:0,count:0}),[c]),w=d.useMemo(()=>{const e=new Map;return C.forEach(a=>e.set(a.id,`${a.account_name} (${a.bank_name})`)),e},[C]),oe=d.useMemo(()=>{const e=[];return n.customer&&e.push(`Customer: ${n.customer}`),(n.date_from||n.date_to)&&e.push(`Date: ${n.date_from||"start"} to ${n.date_to||"today"}`),n.currency&&e.push(`Currency: ${n.currency}`),n.payment_method&&e.push(`Method: ${n.payment_method}`),n.status&&e.push(`Status: ${n.status}`),n.bank_account_id&&e.push(`Bank: ${w.get(Number(n.bank_account_id))||n.bank_account_id}`),e.length?e.join(" | "):"All transaction records"},[n,w]),m=e=>{const{name:a,value:r}=e.target;q(f=>({...f,[a]:r}))},de=()=>q(se),U=e=>{!(e!=null&&e.id)||l||z(e)},ce=async()=>{if(!(!(b!=null&&b.id)||l)){E(b.id);try{await j.delete(b.id),await S(),O("success","Transaction deleted permanently."),z(null)}catch(e){console.error(e),O("error",ze(e,"Failed to delete transaction. Ensure you have Admin permissions."))}finally{E(null)}}},V=e=>{var a;M(e),(a=L.current)==null||a.click()},pe=async e=>{var r;const a=(r=e.target.files)==null?void 0:r[0];if(!(!a||!I)){B(!0);try{await j.uploadReceipt(I,a),alert("Attachment uploaded successfully."),S()}catch(f){console.error(f),alert("Failed to upload attachment file.")}finally{B(!1),M(null),e.target.value=""}}},G=(e,a="Print")=>{const r=window.open("","_blank","width=1120,height=820");if(!r){alert("Please allow popups to print this document.");return}r.document.open(),r.document.write(e),r.document.close(),r.document.title=a},me=`
    <style>
      @page { size: A4 landscape; margin: 12mm; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Arial, sans-serif; color: #0f2748; background: #fff; }
      .sheet { min-height: 186mm; border: 1px solid #d9e8f7; padding: 20px; }
      .brand { display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; border-bottom: 2px solid #0d75dd; padding-bottom: 16px; }
      .brand-left { display: flex; align-items: center; }
      .logo { width: 76px; height: 54px; border-radius: 16px; border: 1px solid #d9e8f7; background: #fff; display: inline-flex; align-items: center; justify-content: center; margin-right: 14px; overflow: hidden; }
      .logo img { width: 100%; height: 100%; object-fit: contain; padding: 4px; }
      h1 { margin: 0; font-size: 23px; letter-spacing: -0.02em; }
      .subtitle { margin-top: 4px; color: #2779c9; font-size: 12px; font-weight: 700; }
      .badge { border: 1px solid #d9e8f7; border-radius: 12px; padding: 9px 12px; text-align: right; font-size: 11px; color: #5d7088; }
      .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 18px 0; }
      .summary div { border: 1px solid #e1ecf8; background: #f7fbff; border-radius: 12px; padding: 10px 12px; }
      .label { display: block; color: #6a7b92; text-transform: uppercase; font-size: 9px; font-weight: 800; letter-spacing: 0.1em; margin-bottom: 5px; }
      .value { font-size: 14px; font-weight: 900; color: #10233f; white-space: nowrap; }
      .filter-value { white-space: normal; line-height: 1.35; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      th { text-align: left; font-size: 8px; color: #0d75dd; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid #cfe0f3; padding: 8px 5px; }
      td { font-size: 9px; border-bottom: 1px solid #e6eef7; padding: 8px 5px; vertical-align: top; overflow-wrap: anywhere; }
      .amount { text-align: right; white-space: nowrap; font-weight: 900; overflow-wrap: normal; }
      .received { color: #059669; }
      .paid { color: #dc2f5f; }
      .status { white-space: nowrap; font-weight: 900; }
      .footer { display: flex; justify-content: space-between; gap: 32px; margin-top: 34px; color: #5f7085; font-size: 11px; font-weight: 700; }
      .line { flex: 1; border-top: 1px solid #7f93aa; padding-top: 8px; }
    </style>
  `,xe=()=>{const e=c.map(a=>`
      <tr>
        <td>${i(a.receipt_no||"-")}</td>
        <td>${i(D(a.date))}</td>
        <td>${i(a.customer_name||"-")}</td>
        <td>${i(a.subject||"-")}</td>
        <td class="amount ${a.type==="Received"?"received":"paid"}">${i(a.type==="Received"?"+":"-")}${i(p(a.amount,a.currency))}</td>
        <td class="amount">${a.equivalent_amount?i(p(a.equivalent_amount,a.equivalent_currency)):"-"}</td>
        <td>${i(a.payment_method||"-")}</td>
        <td>${i(a.receiver_name||"-")}</td>
        <td class="status">${i(a.status||"-")}</td>
      </tr>
    `).join("");return`<!doctype html>
      <html>
        <head>
          <title>{t('transactionHistory.title')}</title>
          ${me}
        </head>
        <body>
          <div class="sheet">
            <div class="brand">
              <div class="brand-left">
                <div class="logo"><img src="${te}" alt="${h}" /></div>
                <div>
                  <h1>${h}</h1>
                  <div class="subtitle">${ee}</div>
                </div>
              </div>
              <div class="badge">
                Transaction Archive<br />
                Generated: ${i(new Date().toLocaleString())}
              </div>
            </div>
            <div class="summary">
              <div><span class="label">{t('transactionHistory.filters')}</span><span class="value filter-value">${i(oe)}</span></div>
              <div><span class="label">{t('transactionHistory.records')}</span><span class="value">${A.count}</span></div>
              <div><span class="label">Received</span><span class="value">${p(A.received,"USD")}</span></div>
              <div><span class="label">Paid</span><span class="value">${p(A.paid,"USD")}</span></div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>{t('transaction.receipt_no')}</th>
                  <th>{t('transaction.date_plain')}</th>
                  <th>{t('customerLedger.customer')}</th>
                  <th>{t('subject')}</th>
                  <th>{t('transaction.amount')}</th>
                  <th>{t('transaction.equivalent')}</th>
                  <th>{t('transaction.method')}</th>
                  <th>{t('receiver')}</th>
                  <th>{t('transaction.status')}</th>
                </tr>
              </thead>
              <tbody>
                ${e||'<tr><td colspan="9" style="text-align:center; padding:24px;">No transaction records matched the selected filters.</td></tr>'}
              </tbody>
            </table>
            <div class="footer">
              <div class="line">Prepared By</div>
              <div class="line">Reviewed By</div>
              <div class="line">Authorized Signature / Stamp</div>
            </div>
          </div>
          <script>window.onload = () => { window.focus(); window.print(); };<\/script>
        </body>
      </html>`},ue=e=>`<!doctype html>
    <html>
      <head>
        <title>${i(e.receipt_no||"Receipt")}</title>
        <style>
          @page { size: A4 portrait; margin: 8mm 10mm; }
          * { box-sizing: border-box; }
          html, body { margin: 0; background: #fff; }
          body { font-family: Tahoma, Arial, Helvetica, sans-serif; color: #10233f; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .receipt { border: 1px solid #d9e8f7; padding: 14px; display: flex; flex-direction: column; page-break-inside: avoid; break-inside: avoid; }
          .brand { overflow: hidden; border: 1px solid #d9e8f7; border-radius: 15px; background: #eff6ff; margin-bottom: 8px; }
          .top-rule { height: 6px; background: linear-gradient(90deg, #0f2a4a, #1677ff, #0f2a4a); }
          .brand-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; padding: 10px 11px; }
          .brand-left { display: flex; align-items: center; min-width: 0; }
          .logo { width: 72px; height: 50px; border-radius: 14px; border: 1px solid #d9e8f7; background: #fff; color: #fff; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 18px; font-weight: 900; overflow: hidden; }
          .logo img { width: 100%; height: 100%; object-fit: contain; padding: 3px; }
          .logo .fallback { display: none; width: 100%; height: 100%; align-items: center; justify-content: center; border-radius: 12px; background: linear-gradient(135deg, #1677ff, #0f2a4a); }
          h1 { margin: 0; font-size: 19px; letter-spacing: -0.01em; color: #0f2a4a; }
          .subtitle { margin-top: 4px; color: #2563eb; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; }
          .badge { display: grid; grid-template-columns: 88px 1fr; gap: 4px 10px; min-width: 218px; background: #fff; border: 1px solid #d9e8f7; border-radius: 14px; padding: 9px 11px; font-size: 10px; font-weight: 900; color: #2563eb; }
          .badge strong { text-align: right; color: #0f172a; }
          .title { margin: 0 0 8px; border-top: 1px solid #dbeafe; border-bottom: 1px solid #dbeafe; background: #eff6ff; padding: 7px 12px; text-align: center; }
          .title h2 { margin: 0; font-size: 14px; letter-spacing: 0.24em; text-transform: uppercase; color: #0f2a4a; }
          .title p { margin: 3px 0 0; font-size: 9px; font-weight: 800; color: #2563eb; }
          .title .fa, .badge small, .summary small, .label small, .section-label small, .sign-card .fa, footer .fa { display: block; direction: rtl; font-size: 8.6px; letter-spacing: 0; opacity: 0.82; margin-top: 1px; }
          .summary { margin-bottom: 8px; display: grid; grid-template-columns: 1.45fr 1fr 1fr 1fr; gap: 7px; border: 1px solid #bbf7d0; border-radius: 13px; background: linear-gradient(135deg, #ecfdf5, #fff, #eff6ff); padding: 8px; }
          .summary span { display: block; color: #64748b; font-size: 10px; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; }
          .summary strong { display: block; margin-top: 6px; color: #111827; font-size: 13px; font-weight: 900; overflow-wrap: anywhere; }
          .summary .money { color: #0f2a4a; font-size: 21px; white-space: nowrap; }
          .section-label { background: #0f2a4a; color: #fff; padding: 5px 10px; font-size: 9px; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; }
          .section-label.light { background: #eff6ff; color: #2563eb; }
          .info { overflow: hidden; border: 1px solid #d9e8f7; border-radius: 16px; }
          .row { display: grid; grid-template-columns: 148px minmax(0, 1fr); border-bottom: 1px solid #e6eef7; }
          .row:last-child { border-bottom: 0; }
          .label { background: #f3f8ff; padding: 5px 10px; color: #0d75dd; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.04em; }
          .value { padding: 6px 10px; color: #10233f; font-size: 11px; font-weight: 800; overflow-wrap: anywhere; }
          .info + .info { margin-top: 6px; }
          .amount { font-size: 18px; font-weight: 900; color: #071b34; white-space: nowrap; overflow-wrap: normal; }
          .notes { margin-top: 6px; border: 1px solid #d9e8f7; border-radius: 13px; background: #f8fbff; padding: 7px 9px; }
          .notes .label { display: block; background: transparent; padding: 0; margin-bottom: 6px; }
          .notes p { margin: 0; min-height: 20px; color: #334155; font-size: 10.5px; font-weight: 700; line-height: 1.32; }
          .sign { margin-top: 8px; padding-top: 8px; border-top: 2px solid #d9e8f7; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
          .sign-card { min-height: 68px; border: 1px solid #d9e8f7; border-radius: 12px; padding: 7px; display: flex; flex-direction: column; justify-content: flex-end; text-align: center; }
          .line { height: 18px; border-bottom: 1px solid #94a3b8; margin-bottom: 4px; }
          .date-line { width: 100%; border-bottom: 1px dotted #cbd5e1; height: 6px; margin: 2px 0 1px; }
          .stamp { height: 36px; width: 96px; border: 2px dashed #93c5fd; background: #f8fbff; border-radius: 10px; margin: 0 auto 4px; display: flex; align-items: center; justify-content: center; color: #60a5fa; font-size: 7.5px; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; }
          .sign-card b { color: #0d75dd; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; }
          .sign-card small { margin-top: 4px; color: #64748b; font-size: 9px; font-weight: 700; }
          footer { margin-top: 6px; border-top: 1px solid #d9e8f7; padding-top: 5px; text-align: center; color: #64748b; font-size: 8px; font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="brand">
            <div class="top-rule"></div>
            <div class="brand-row">
              <div class="brand-left">
                <div class="logo">
                  <img src="${window.location.origin}${te}" alt="${h}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
                  <span class="fallback">SA</span>
                </div>
                <div>
                  <h1>${h}</h1>
                  <div class="subtitle">${ee}</div>
                </div>
              </div>
              <div class="badge">
                <span>{t('transaction.receipt_no')}<small dir="rtl">شماره رسید</small></span><strong>${i(e.receipt_no||"-")}</strong>
                <span>{t('transaction.date_plain')}<small dir="rtl">تاریخ</small></span><strong>${i(e.date||"-")}</strong>
                <span>{t('transaction.status')}<small dir="rtl">وضعیت</small></span><strong>${i(e.status||"-")}</strong>
              </div>
            </div>
          </div>
          <div class="title">
            <h2>Money Transaction Receipt</h2>
            <div class="fa" dir="rtl">رسید انتقال وجه</div>
            <p>Official Payment / Hawala / Bank Transfer Record<span class="fa" dir="rtl">سند رسمی پرداخت / حواله / انتقال بانکی</span></p>
          </div>
          <div class="summary">
            <div><span>{t('transaction.amount')}<small dir="rtl">مبلغ</small></span><strong class="money">${i(p(e.amount,e.currency))}</strong></div>
            <div><span>{t('transaction.equivalent')}<small dir="rtl">معادل</small></span><strong>${i(e.equivalent_amount?p(e.equivalent_amount,e.equivalent_currency):"-")}</strong></div>
            <div><span>{t('transaction.method')}<small dir="rtl">روش پرداخت</small></span><strong>${i(e.payment_method||"-")}</strong></div>
            <div><span>{t('transaction.status')}<small dir="rtl">وضعیت</small></span><strong>${i(e.status||"-")}</strong></div>
          </div>
          <div class="info">
            <div class="section-label">Party Details<small dir="rtl">مشخصات طرف معامله</small></div>
            <div class="row"><div class="label">{t('customerLedger.customer')}<small dir="rtl">مشتری</small></div><div class="value">${i(e.customer_name||"-")}</div></div>
            <div class="row"><div class="label">Company<small dir="rtl">شرکت</small></div><div class="value">${i(e.company_name||"-")}</div></div>
            <div class="row"><div class="label">{t('subject')}<small dir="rtl">موضوع</small></div><div class="value">${i(e.subject||"-")}</div></div>
            <div class="row"><div class="label">{t('receiver')}<small dir="rtl">دریافت کننده</small></div><div class="value">${i(e.receiver_name||"-")}</div></div>
          </div>
          <div class="info">
            <div class="section-label light">Payment Information<small dir="rtl">معلومات پرداخت</small></div>
            <div class="row"><div class="label">Payment Method<small dir="rtl">روش پرداخت</small></div><div class="value">${i(e.payment_method||"-")}</div></div>
            <div class="row"><div class="label">Bank Account<small dir="rtl">حساب بانکی</small></div><div class="value">${i(w.get(e.bank_account_id)||(e.bank_account_id?`Account ID: ${e.bank_account_id}`:"No bank account selected"))}</div></div>
            <div class="row"><div class="label">Currency<small dir="rtl">واحد پول</small></div><div class="value">${i(e.currency||"-")}</div></div>
            <div class="row"><div class="label">Equivalent Currency<small dir="rtl">واحد پول معادل</small></div><div class="value">${i(e.equivalent_currency||"-")}</div></div>
          </div>
          <div class="notes">
            <span class="label">Description / Notes<small dir="rtl">توضیحات</small></span>
            <p>${i(e.description||"No description notes.")}</p>
          </div>
          <div class="sign">
            <div class="sign-card"><div class="line"></div><b>Prepared By<span class="fa" dir="rtl">تهیه کننده</span></b><div class="date-line"></div><small>Authorized officer</small></div>
            <div class="sign-card"><div class="line"></div><b>Customer Signature<span class="fa" dir="rtl">امضای مشتری</span></b><div class="date-line"></div><small>Received and confirmed</small></div>
            <div class="sign-card"><div class="stamp">Company Stamp<span class="fa" dir="rtl">مهر شرکت</span></div><b>Company Stamp<span class="fa" dir="rtl">مهر شرکت</span></b><div class="date-line"></div><small>Official seal area</small></div>
          </div>
          <footer>
            Official receipt generated by ${h}.<br />
            <span class="fa" dir="rtl">رسید رسمی ایجاد شده توسط ${h}</span>
            Printed on ${i(new Date().toLocaleString())} - This receipt is system-generated and valid for office accounting records. Page 1 of 1.
          </footer>
        </div>
        <script>window.onload = () => { window.focus(); window.print(); };<\/script>
      </body>
    </html>`,be=()=>{G(xe(),s("transactionHistory.title"))},fe=()=>{const e=["Company","Receipt No","Date","Customer","Subject","Type","Amount","Currency","Equivalent Amount","Equivalent Currency","Payment Method","Bank Account","Receiver","Status","Description"],a=c.map(o=>[h,o.receipt_no,o.date,o.customer_name,o.subject,o.type,o.amount,o.currency,o.equivalent_amount,o.equivalent_currency,o.payment_method,w.get(o.bank_account_id)||"",o.receiver_name,o.status,o.description]),r=[e,...a].map(o=>o.map(Ce).join(",")).join(`
`),f=new Blob([r],{type:"text/csv;charset=utf-8;"}),J=URL.createObjectURL(f),y=document.createElement("a");y.href=J,y.download=`${ae("transaction-archive")}.csv`,document.body.appendChild(y),y.click(),y.remove(),URL.revokeObjectURL(J)},Y=e=>{G(ue(e),e.receipt_no||"Receipt")},W=async e=>{try{await j.downloadPDF(e.id,`${ae(e.receipt_no||`transaction-${e.id}`)}.pdf`)}catch(a){console.error(a),alert("Failed to download receipt PDF.")}};return t.jsxs("div",{className:"space-y-6",children:[t.jsxs("div",{className:"flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between",children:[t.jsxs("div",{className:"min-w-0",children:[t.jsx("h1",{className:"text-2xl font-black text-sky-950 leading-tight tracking-normal",children:s("transactionHistory.title")}),t.jsx("p",{className:"text-sm text-sky-600 font-semibold mt-1",children:"Search, print, export, and manage Hawala receipt records."})]}),t.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[t.jsxs("button",{onClick:()=>le(e=>!e),className:`h-12 inline-flex items-center gap-2 px-4 rounded-2xl border border-sky-100 font-black text-sm transition-all ${T?"bg-sky-500 text-white shadow-lg shadow-sky-500/20":"bg-white/75 hover:bg-sky-50 text-sky-800"}`,children:[t.jsx(je,{size:16}),t.jsx("span",{children:s("transactionHistory.filters")})]}),t.jsxs("button",{onClick:be,className:"h-12 inline-flex items-center gap-2 px-4 bg-white/75 hover:bg-sky-50 border border-sky-100 font-black text-sm text-sky-800 rounded-2xl shadow-lg shadow-sky-900/5 transition-all",children:[t.jsx(H,{size:16}),t.jsx("span",{children:s("transactionHistory.print_archive")})]}),t.jsxs("button",{onClick:fe,className:"h-12 inline-flex items-center gap-2 px-4 bg-gradient-to-tr from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black rounded-2xl shadow-lg shadow-emerald-500/20 transition-all text-sm",children:[t.jsx(ke,{size:16}),t.jsx("span",{children:s("transactionHistory.export_csv")})]})]})]}),t.jsx("input",{type:"file",ref:L,onChange:pe,className:"hidden",accept:".pdf,image/*"}),T&&t.jsx(K,{className:"p-5 animate-fadeIn",children:t.jsxs("div",{className:"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-4",children:[t.jsxs("div",{children:[t.jsx("label",{className:"block text-[11px] font-black text-sky-600 uppercase tracking-wide mb-2",children:"Customer Name"}),t.jsxs("div",{className:"relative",children:[t.jsx(we,{size:15,className:"absolute left-4 top-1/2 -translate-y-1/2 text-sky-400"}),t.jsx("input",{type:"text",name:"customer",className:"h-12 w-full pl-11 pr-4 rounded-2xl border border-sky-100 bg-white/70 focus:outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-500/10 text-base font-bold",placeholder:"Search customer...",value:n.customer,onChange:m})]})]}),t.jsxs("div",{children:[t.jsx("label",{className:"block text-[11px] font-black text-sky-600 uppercase tracking-wide mb-2",children:s("transactionHistory.date_from")}),t.jsx("input",{type:"date",name:"date_from",className:"h-12 w-full px-4 rounded-2xl border border-sky-100 bg-white/70 focus:outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-500/10 text-base font-bold",value:n.date_from,onChange:m})]}),t.jsxs("div",{children:[t.jsx("label",{className:"block text-[11px] font-black text-sky-600 uppercase tracking-wide mb-2",children:s("transactionHistory.date_to")}),t.jsx("input",{type:"date",name:"date_to",className:"h-12 w-full px-4 rounded-2xl border border-sky-100 bg-white/70 focus:outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-500/10 text-base font-bold",value:n.date_to,onChange:m})]}),t.jsxs("div",{children:[t.jsx("label",{className:"block text-[11px] font-black text-sky-600 uppercase tracking-wide mb-2",children:s("transactionHistory.currency")}),t.jsxs("select",{name:"currency",className:"h-12 w-full px-4 rounded-2xl border border-sky-100 bg-white/70 focus:outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-500/10 text-base font-bold",value:n.currency,onChange:m,children:[t.jsx("option",{value:"",children:s("transactionHistory.all_currencies")}),Ne.map(e=>t.jsx("option",{value:e,children:e},e))]})]}),t.jsxs("div",{children:[t.jsx("label",{className:"block text-[11px] font-black text-sky-600 uppercase tracking-wide mb-2",children:s("transactionHistory.payment_method")}),t.jsxs("select",{name:"payment_method",className:"h-12 w-full px-4 rounded-2xl border border-sky-100 bg-white/70 focus:outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-500/10 text-base font-bold",value:n.payment_method,onChange:m,children:[t.jsx("option",{value:"",children:s("transactionHistory.all_methods")}),_e.map(e=>t.jsx("option",{value:e,children:e},e))]})]}),t.jsxs("div",{children:[t.jsx("label",{className:"block text-[11px] font-black text-sky-600 uppercase tracking-wide mb-2",children:s("transactionHistory.bank_account")}),t.jsxs("select",{name:"bank_account_id",className:"h-12 w-full px-4 rounded-2xl border border-sky-100 bg-white/70 focus:outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-500/10 text-base font-bold",value:n.bank_account_id,onChange:m,children:[t.jsx("option",{value:"",children:s("transactionHistory.all_accounts")}),C.map(e=>t.jsxs("option",{value:e.id,children:[e.account_name," (",e.bank_name,")"]},e.id))]})]}),t.jsxs("div",{children:[t.jsx("label",{className:"block text-[11px] font-black text-sky-600 uppercase tracking-wide mb-2",children:s("transaction.status")}),t.jsxs("select",{name:"status",className:"h-12 w-full px-4 rounded-2xl border border-sky-100 bg-white/70 focus:outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-500/10 text-base font-bold",value:n.status,onChange:m,children:[t.jsx("option",{value:"",children:s("transactionHistory.all_statuses")}),$e.map(e=>t.jsx("option",{value:e,children:e},e))]})]}),t.jsxs("div",{children:[t.jsx("label",{className:"block text-[11px] font-black text-sky-600 uppercase tracking-wide mb-2",children:s("transactionHistory.amount_min")}),t.jsx("input",{type:"number",name:"amount_min",className:"h-12 w-full px-4 rounded-2xl border border-sky-100 bg-white/70 focus:outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-500/10 text-base font-bold",placeholder:"0.00",value:n.amount_min,onChange:m})]}),t.jsxs("div",{children:[t.jsx("label",{className:"block text-[11px] font-black text-sky-600 uppercase tracking-wide mb-2",children:s("transactionHistory.amount_max")}),t.jsx("input",{type:"number",name:"amount_max",className:"h-12 w-full px-4 rounded-2xl border border-sky-100 bg-white/70 focus:outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-500/10 text-base font-bold",placeholder:"0.00",value:n.amount_max,onChange:m})]}),t.jsx("div",{className:"flex items-end",children:t.jsx("button",{onClick:de,className:"h-12 w-full rounded-2xl bg-sky-100/70 hover:bg-sky-100 text-sky-800 font-black text-sm transition-all",children:"Reset Filters"})})]})}),re&&t.jsx("div",{className:"rounded-2xl border border-sky-100 bg-white/70 p-3 text-sm font-bold text-sky-700 shadow-lg shadow-sky-900/5",children:"Uploading attachment..."}),t.jsx(K,{className:"p-4 sm:p-6 min-w-0",children:ne?t.jsxs("div",{className:"py-20 flex flex-col items-center justify-center",children:[t.jsx(N,{className:"animate-spin text-sky-500 mb-3",size:32}),t.jsx("p",{className:"text-sm font-bold text-sky-600",children:s("transactionHistory.retrieving")})]}):t.jsxs("div",{children:[t.jsxs("div",{className:"block md:hidden space-y-4 ios-card-fade-up",children:[c.map(e=>t.jsxs("div",{className:`p-4 bg-white border border-sky-100 rounded-[20px] space-y-3.5 shadow-sm shadow-sky-950/[0.02] border-l-4 transition-all ${e.type==="Received"?"border-l-emerald-500":"border-l-rose-500"} ${l===e.id?"opacity-70":""}`,children:[t.jsxs("div",{className:"flex justify-between items-start gap-2",children:[t.jsxs("div",{children:[t.jsxs("div",{className:"flex items-center gap-1.5 flex-wrap",children:[t.jsx("button",{className:"text-sm font-black text-sky-700 hover:underline text-left min-h-[32px] flex items-center",onClick:()=>x(`/transactions/${e.id}`),children:e.receipt_no}),e.attachment_path&&t.jsx("span",{className:"p-1.5 bg-sky-50 rounded-md shrink-0 cursor-pointer min-w-[24px] min-h-[24px] flex items-center justify-center",onClick:()=>x(`/transactions/${e.id}`),children:t.jsx(_,{size:12,className:"text-sky-500"})})]}),t.jsx("p",{className:"text-[10px] font-bold text-sky-500 mt-0.5",children:D(e.date)})]}),t.jsx("span",{className:`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide whitespace-nowrap ${e.status==="Completed"?"bg-emerald-50 text-emerald-600":e.status==="Pending"?"bg-amber-50 text-amber-600":"bg-rose-50 text-rose-600"}`,children:e.status})]}),t.jsxs("div",{className:"grid grid-cols-2 gap-y-2 gap-x-4 text-xs py-2.5 border-y border-sky-50/50",children:[t.jsxs("div",{children:[t.jsx("span",{className:"text-slate-400 block font-bold text-[9px] uppercase tracking-wider",children:s("customerLedger.customer")}),t.jsx("span",{className:"font-extrabold text-slate-800 truncate block",children:e.customer_name||"-"})]}),t.jsxs("div",{className:"text-right",children:[t.jsx("span",{className:"text-slate-400 block font-bold text-[9px] uppercase tracking-wider",children:s("receiver")}),t.jsx("span",{className:"font-extrabold text-slate-800 truncate block",children:e.receiver_name||"-"})]}),t.jsxs("div",{children:[t.jsx("span",{className:"text-slate-400 block font-bold text-[9px] uppercase tracking-wider",children:s("transaction.amount")}),t.jsxs("span",{className:`font-black ${e.type==="Received"?"text-emerald-600":"text-rose-600"}`,children:[e.type==="Received"?"+":"-",p(e.amount,e.currency)]})]}),t.jsxs("div",{className:"text-right",children:[t.jsx("span",{className:"text-slate-400 block font-bold text-[9px] uppercase tracking-wider",children:s("transaction.equivalent")}),t.jsx("span",{className:"font-black text-sky-800",children:e.equivalent_amount?p(e.equivalent_amount,e.equivalent_currency):"-"})]})]}),t.jsxs("div",{className:"flex flex-col gap-3 pt-1",children:[t.jsxs("span",{className:"text-[10px] text-slate-500 font-bold",children:[s("transactionHistory.method_colon")," ",t.jsx("strong",{className:"text-slate-700",children:e.payment_method})]}),t.jsxs("div",{className:"flex gap-1.5 flex-wrap w-full",children:[t.jsx("button",{onClick:()=>x(`/transactions/${e.id}`),disabled:l===e.id,className:"h-11 flex-1 min-w-[50px] inline-flex items-center justify-center bg-sky-50 text-sky-600 rounded-xl disabled:opacity-50 transition-all hover:bg-sky-100",title:"View","aria-label":`View transaction ${e.receipt_no}`,children:t.jsx(Q,{size:16})}),t.jsx("button",{onClick:()=>Y(e),disabled:l===e.id,className:"h-11 flex-1 min-w-[50px] inline-flex items-center justify-center bg-sky-50 text-sky-600 rounded-xl disabled:opacity-50 transition-all hover:bg-sky-100",title:"Print","aria-label":`Print transaction ${e.receipt_no}`,children:t.jsx(H,{size:16})}),t.jsx("button",{onClick:()=>W(e),disabled:l===e.id,className:"h-11 flex-1 min-w-[50px] inline-flex items-center justify-center bg-sky-50 text-sky-600 rounded-xl disabled:opacity-50 transition-all hover:bg-sky-100",title:"PDF","aria-label":`Download PDF for transaction ${e.receipt_no}`,children:t.jsx(X,{size:16})}),!u&&t.jsx("button",{onClick:()=>V(e.id),disabled:l===e.id,className:"h-11 flex-1 min-w-[50px] inline-flex items-center justify-center bg-sky-50 text-sky-600 rounded-xl disabled:opacity-50 transition-all hover:bg-sky-100",title:"Attach","aria-label":`Attach receipt to transaction ${e.receipt_no}`,children:t.jsx(_,{size:16})}),!u&&t.jsx("button",{onClick:()=>x(`/edit-transaction/${e.id}`),disabled:l===e.id,className:"h-11 flex-1 min-w-[50px] inline-flex items-center justify-center bg-sky-50 text-sky-600 rounded-xl disabled:opacity-50 transition-all hover:bg-sky-100",title:"Edit","aria-label":`Edit transaction ${e.receipt_no}`,children:t.jsx(Z,{size:16})}),g&&t.jsx("button",{onClick:()=>U(e),disabled:l===e.id,className:"h-11 flex-1 min-w-[50px] inline-flex items-center justify-center bg-rose-50 text-rose-600 rounded-xl disabled:opacity-50 transition-all hover:bg-rose-100",title:"Delete Permanently","aria-label":`Delete transaction ${e.receipt_no}`,children:l===e.id?t.jsx(N,{size:16,className:"animate-spin"}):t.jsx($,{size:16})})]})]})]},e.id)),c.length===0&&t.jsx("div",{className:"py-10 text-center text-sky-400 font-bold",children:"No transaction records matched the search filters."})]}),t.jsx("div",{className:"hidden md:block overflow-x-auto app-scrollbar",children:t.jsxs("table",{className:"w-full min-w-[1100px] text-left border-collapse",children:[t.jsx("thead",{children:t.jsxs("tr",{className:"border-b border-sky-100 text-[11px] font-black text-sky-500 uppercase tracking-[0.14em]",children:[t.jsx("th",{className:"pb-3 pr-4",children:s("transaction.receipt_no")}),t.jsx("th",{className:"pb-3 px-4",children:s("transaction.date_plain")}),t.jsx("th",{className:"pb-3 px-4",children:s("customerLedger.customer")}),t.jsx("th",{className:"pb-3 px-4 text-right",children:s("transaction.amount")}),t.jsx("th",{className:"pb-3 px-4 text-right",children:s("transaction.equivalent")}),t.jsx("th",{className:"pb-3 px-4",children:s("transaction.method")}),t.jsx("th",{className:"pb-3 px-4",children:s("receiver")}),t.jsx("th",{className:"pb-3 px-4",children:s("transaction.status")}),t.jsx("th",{className:"pb-3 pl-4 text-right",children:"ACTIONS"})]})}),t.jsxs("tbody",{className:"divide-y divide-sky-100/60 text-sm font-bold text-sky-900",children:[c.map(e=>t.jsxs("tr",{className:`hover:bg-sky-50/40 transition-colors group ${l===e.id?"opacity-70":""}`,children:[t.jsx("td",{className:"py-4 pr-4 font-black text-sky-950 whitespace-nowrap",children:t.jsxs("div",{className:"flex items-center gap-2 min-w-0",children:[t.jsx("button",{className:"text-left text-sky-700 hover:text-sky-950 hover:underline truncate max-w-[150px]",onClick:()=>x(`/transactions/${e.id}`),children:e.receipt_no}),e.attachment_path&&t.jsx(_,{size:13,className:"text-sky-400 shrink-0 cursor-pointer",title:e.attachment_path.split(/[\\/]/).pop(),onClick:()=>x(`/transactions/${e.id}`)})]})}),t.jsx("td",{className:"py-4 px-4 text-sky-500 whitespace-nowrap",children:D(e.date)}),t.jsx("td",{className:"py-4 px-4 max-w-[180px] truncate",children:e.customer_name||"-"}),t.jsxs("td",{className:`py-4 px-4 text-right font-black whitespace-nowrap ${e.type==="Received"?"text-emerald-600":"text-rose-600"}`,children:[e.type==="Received"?"+":"-",p(e.amount,e.currency)]}),t.jsx("td",{className:"py-4 px-4 text-right text-sky-800 font-black whitespace-nowrap",children:e.equivalent_amount?p(e.equivalent_amount,e.equivalent_currency):"-"}),t.jsx("td",{className:"py-4 px-4 text-sky-900/70 whitespace-nowrap",children:e.payment_method||"-"}),t.jsx("td",{className:"py-4 px-4 text-sky-900/70 truncate max-w-[130px]",children:e.receiver_name||"-"}),t.jsx("td",{className:"py-4 px-4",children:t.jsx("span",{className:`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide whitespace-nowrap ${e.status==="Completed"?"bg-emerald-50 text-emerald-600":e.status==="Pending"?"bg-amber-50 text-amber-600":"bg-rose-50 text-rose-600"}`,children:e.status})}),t.jsx("td",{className:"py-4 pl-4 text-right",children:t.jsxs("div",{className:"inline-flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity",children:[t.jsx("button",{onClick:()=>x(`/transactions/${e.id}`),disabled:l===e.id,className:"p-2 text-sky-600 hover:bg-sky-50 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed",title:"View Details","aria-label":`View transaction ${e.receipt_no}`,children:t.jsx(Q,{size:15})}),t.jsx("button",{onClick:()=>Y(e),disabled:l===e.id,className:"p-2 text-sky-600 hover:bg-sky-50 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed",title:"Print Receipt","aria-label":`Print transaction ${e.receipt_no}`,children:t.jsx(H,{size:15})}),t.jsx("button",{onClick:()=>W(e),disabled:l===e.id,className:"p-2 text-sky-600 hover:bg-sky-50 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed",title:"Download PDF","aria-label":`Download PDF for transaction ${e.receipt_no}`,children:t.jsx(X,{size:15})}),!u&&t.jsx("button",{onClick:()=>V(e.id),disabled:l===e.id,className:"p-2 text-sky-600 hover:bg-sky-50 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed",title:"Attach Receipt","aria-label":`Attach receipt to transaction ${e.receipt_no}`,children:t.jsx(_,{size:15})}),!u&&t.jsx("button",{onClick:()=>x(`/edit-transaction/${e.id}`),disabled:l===e.id,className:"p-2 text-sky-600 hover:bg-sky-50 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed",title:"Edit Details","aria-label":`Edit transaction ${e.receipt_no}`,children:t.jsx(Z,{size:15})}),g&&t.jsx("button",{onClick:()=>U(e),disabled:l===e.id,className:"p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed",title:"Delete Permanently","aria-label":`Delete transaction ${e.receipt_no}`,children:l===e.id?t.jsx(N,{size:15,className:"animate-spin"}):t.jsx($,{size:15})})]})})]},e.id)),c.length===0&&t.jsx("tr",{children:t.jsx("td",{colSpan:"9",className:"py-14 text-center text-sky-400 font-bold",children:"No transaction records matched the search filters."})})]})]})})]})}),P&&t.jsx("div",{className:`fixed bottom-6 right-6 z-50 max-w-sm rounded-2xl border px-4 py-3 text-sm font-black shadow-2xl backdrop-blur-xl ${P.type==="success"?"border-emerald-100 bg-emerald-50/95 text-emerald-700":"border-rose-100 bg-rose-50/95 text-rose-700"}`,role:"status",children:P.message}),b&&t.jsx("div",{className:"fixed inset-0 z-40 flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm",role:"dialog","aria-modal":"true","aria-labelledby":"delete-transaction-title",children:t.jsxs("div",{className:"w-full max-w-md rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-2xl shadow-slate-900/20",children:[t.jsxs("div",{className:"mb-5 flex items-start gap-4",children:[t.jsx("div",{className:"flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600",children:t.jsx($,{size:22})}),t.jsxs("div",{children:[t.jsx("h2",{id:"delete-transaction-title",className:"text-xl font-black text-slate-950",children:"Delete Transaction?"}),t.jsxs("p",{className:"mt-2 text-sm font-semibold leading-6 text-slate-600",children:["This will permanently delete receipt ",t.jsx("span",{className:"font-black text-slate-950",children:b.receipt_no})," and its transaction history. This action cannot be undone."]})]})]}),t.jsxs("div",{className:"flex flex-col-reverse gap-3 sm:flex-row sm:justify-end",children:[t.jsx("button",{type:"button",onClick:()=>z(null),disabled:!!l,className:"h-12 rounded-2xl border border-sky-100 bg-white px-5 text-sm font-black text-slate-700 shadow-sm transition-colors hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60",children:"Cancel"}),t.jsxs("button",{type:"button",onClick:ce,disabled:!!l,className:"inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 text-sm font-black text-white shadow-lg shadow-rose-900/20 transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70",children:[l?t.jsx(N,{size:16,className:"animate-spin"}):t.jsx($,{size:16}),"Delete Permanently"]})]})]})})]})}export{Le as default};
