const https = require('https');

https.get('https://aqcompaniesbl.vercel.app/api/bol?pageSize=250', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('HTTP Status:', res.statusCode);
      console.log('Total BOLs:', parsed.total || (parsed.data && parsed.data.length));
      const items = parsed.data || parsed.items || (Array.isArray(parsed) ? parsed : []);
      const nsa486 = items.find(b => (b.bol_number || b.id) === 'BOL-2026-NSA486');
      if (nsa486) {
        console.log('NSA486 found successfully!');
        console.log('BOL Number:', nsa486.bol_number);
        console.log('Issue Date:', nsa486.issue_date);
        console.log('Truck Number:', nsa486.truck_number);
        console.log('Driver Name:', nsa486.driver_name);
        console.log('Driver Rent:', nsa486.driver_rent);
        console.log('Shipper:', nsa486.shipper_name);
        console.log('Consignee:', nsa486.consignee_name);
        console.log('Packages:', nsa486.number_of_packages);
        console.log('Routes:', nsa486.routes ? nsa486.routes.length : 0);
      } else {
        console.log('NSA486 NOT found in items. Sample items:', items.slice(0, 3).map(x => x.bol_number || x.id));
      }
    } catch (e) {
      console.error('Error parsing response:', e, data.slice(0, 200));
    }
  });
}).on('error', err => {
  console.error('Request error:', err);
});
