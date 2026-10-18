import React from 'react'
import { BRAND_LOGO_SRC, DEFAULT_COMPANY_NAME, DEFAULT_COMPANY_SUBTITLE } from '../../config/branding'
import type { PackingListDocument } from '../../types/packingList'

interface PackingListModuleProps {
  data: PackingListDocument
}

export const PackingListModule: React.FC<PackingListModuleProps> = ({ data }) => {
  const { exporter, importer, shipping, items } = data
  const companyName = exporter.company_name || DEFAULT_COMPANY_NAME
  const totalCartons = items.reduce((sum, item) => sum + item.quantity_cartons, 0)
  const totalNetWeight = items.reduce((sum, item) => sum + item.net_weight_kg, 0)
  const totalGrossWeight = items.reduce((sum, item) => sum + item.gross_weight_kg, 0)
  const totalVolume = items.reduce(
    (sum, item) => sum + (item.total_volume_cbm ?? item.quantity_cartons * item.volume_per_carton_cbm),
    0,
  )
  const formatNumber = (value: number, maximumFractionDigits = 3) =>
    Number(value || 0).toLocaleString('en-US', { maximumFractionDigits })

  return (
    <article className="packing-document" aria-label={`Packing list ${shipping.packing_list_number}`}>
      <header className="packing-document__header">
        <div className="packing-document__brand">
          <img src={BRAND_LOGO_SRC} alt={`${companyName} logo`} />
          <div>
            <strong>{companyName}</strong>
            <span>{DEFAULT_COMPANY_SUBTITLE}</span>
          </div>
        </div>
        <div className="packing-document__title">
          <span>Export documentation</span>
          <h1>PACKING LIST</h1>
        </div>
      </header>

      <section className="packing-document__meta" aria-label="Document details">
        <div><span>Packing list no.</span><strong>{shipping.packing_list_number || 'Not assigned'}</strong></div>
        <div><span>Date</span><strong>{shipping.date || '—'}</strong></div>
        <div><span>Commercial invoice</span><strong>{shipping.invoice_number || '—'}</strong></div>
        <div><span>AWB / B/L no.</span><strong>{shipping.airway_bill?.number || '—'}</strong></div>
      </section>

      <section className="packing-document__parties">
        <div className="packing-document__party">
          <span className="packing-document__section-label">Exporter / Shipper</span>
          <h2>{exporter.company_name || 'Exporter name'}</h2>
          <p>{exporter.address || 'Exporter address'}</p>
          <p>{exporter.telephone ? `Tel: ${exporter.telephone}` : 'Telephone not provided'}</p>
          {(exporter.license_number || exporter.swift_code) && (
            <div className="packing-document__party-identifiers">
              {exporter.license_number && <span>License: {exporter.license_number}</span>}
              {exporter.swift_code && <span>SWIFT: {exporter.swift_code}</span>}
            </div>
          )}
        </div>
        <div className="packing-document__party packing-document__party--importer">
          <span className="packing-document__section-label">Consignee / Importer</span>
          <h2>{importer.company_name || 'Consignee name'}</h2>
          <p>{importer.address || 'Consignee address'}</p>
          <p>{importer.phone_number ? `Tel: ${importer.phone_number}` : 'Telephone not provided'}</p>
          {(importer.gst_number || importer.iec_code || importer.fssai_number) && (
            <div className="packing-document__party-identifiers">
              {importer.gst_number && <span>GST: {importer.gst_number}</span>}
              {importer.iec_code && <span>IEC: {importer.iec_code}</span>}
              {importer.fssai_number && <span>FSSAI: {importer.fssai_number}</span>}
            </div>
          )}
        </div>
      </section>

      <section className="packing-document__routing" aria-label="Shipment routing">
        <div><span>Through</span><strong>{shipping.routing.through || '—'}</strong></div>
        <div><span>Mode / Route</span><strong>{shipping.routing.via || '—'}</strong></div>
        <div><span>AWB / B/L date</span><strong>{shipping.airway_bill?.date || '—'}</strong></div>
        <div><span>Payment reference</span><strong>{shipping.terms_of_payment.letter_of_credit_no || shipping.terms_of_payment.collection_basis_no || '—'}</strong></div>
      </section>

      <section className="packing-document__items" aria-label="Packed goods">
        <div className="packing-document__table-heading">
          <span className="packing-document__section-label">Package manifest</span>
          <strong>{items.length} line item{items.length === 1 ? '' : 's'}</strong>
        </div>
        <table>
          <thead>
            <tr>
              <th>No.</th>
              <th>Description of goods</th>
              <th>Packages</th>
              <th>Dimensions (cm)</th>
              <th>Net kg</th>
              <th>Gross kg</th>
              <th>Volume m³</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const itemTotalVol = item.total_volume_cbm ?? item.quantity_cartons * item.volume_per_carton_cbm
              return (
                <tr key={`${item.item_no}-${index}`}>
                  <td>{item.item_no}</td>
                  <td>
                    <strong>{item.product_name || 'Unnamed goods'}</strong>
                    <span>Origin: {item.origin_country || '—'}</span>
                  </td>
                  <td><strong>{formatNumber(item.quantity_cartons)}</strong> {item.unit_label || 'PKGS'}</td>
                  <td>{formatNumber(item.dimensions.length_cm)} &times; {formatNumber(item.dimensions.width_cm)} &times; {formatNumber(item.dimensions.height_cm)}</td>
                  <td>{formatNumber(item.net_weight_kg)}</td>
                  <td>{formatNumber(item.gross_weight_kg)}</td>
                  <td>{formatNumber(itemTotalVol)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>TOTAL</td>
              <td>{formatNumber(totalCartons)} PKGS</td>
              <td />
              <td>{formatNumber(totalNetWeight)} KG</td>
              <td>{formatNumber(totalGrossWeight)} KG</td>
              <td>{formatNumber(totalVolume)} M³</td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section className="packing-document__footer">
        <div className="packing-document__remarks">
          <span className="packing-document__section-label">Remarks</span>
          <p>{data.remarks || 'Goods packed for export in sound condition.'}</p>
          {(exporter.bank_name || exporter.account_number) && (
            <small>
              {exporter.bank_name && <span>Bank: {exporter.bank_name}</span>}
              {exporter.account_number && <span>Account: {exporter.account_number}</span>}
            </small>
          )}
        </div>
        <div className="packing-document__signature">
          <strong>{data.signatory_company || exporter.company_name || 'Authorized exporter'}</strong>
          <span>Authorized signature &amp; stamp</span>
        </div>
      </section>

      <div className="packing-document__legal-line">
        This packing list accurately describes the number, type, weight, and measurements of the packages stated above.
      </div>
    </article>
  )
}
