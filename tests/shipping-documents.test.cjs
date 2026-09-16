const test=require('node:test');
const assert=require('node:assert/strict');
const load=require('./load-typescript.cjs');
const pashtoBidi = load('lib/utils/pashto-bidi.ts');
const pdfFonts = load('lib/utils/pdf-fonts.ts', {
  './pashto-bidi': pashtoBidi,
});
const {generateShippingDocumentsPDF}=load('lib/utils/shipping-documents.ts',{
  '@/lib/sticker-badges-data':load('lib/sticker-badges-data.ts'),
  '@/lib/utils/pashto-bidi':pashtoBidi,
  '@/lib/utils/pdf-fonts':pdfFonts,
});
const data={bolNumber:'BOL-QA',invoiceNumber:'INV-QA',shipper:'Test exporter',consignee:'Test importer',commodity:'Raisins',packageCount:12,netWeight:'120 KG',grossWeight:'132 KG',commodities:[]};
async function pages(options){const blob=await generateShippingDocumentsPDF({kind:'stickers',data,...options});const text=new TextDecoder('latin1').decode(await blob.arrayBuffer());assert.equal(text.slice(0,5),'%PDF-');return (text.match(/\/Type\s*\/Page\b/g)||[]).length;}
test('sticker sheets paginate all requested labels, including a partial last sheet',async()=>{
 assert.equal(await pages({stickerLayout:'sheet',stickerQuantity:12}),2);
 assert.equal(await pages({stickerLayout:'sheet',stickerQuantity:7}),2);
});
test('single sticker pages honor quantity and default master remains one page',async()=>{
 assert.equal(await pages({stickerLayout:'single',stickerQuantity:3}),3);
 assert.equal(await pages({}),1);
});
test('rejects invalid sticker quantities',async()=>{
 for(const stickerQuantity of [0,-1,1.5,Infinity])await assert.rejects(pages({stickerQuantity}),/positive whole number/);
});
