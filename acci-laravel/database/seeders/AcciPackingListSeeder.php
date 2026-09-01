<?php

namespace Database\Seeders;

use App\Models\AcciPackingList;
use Illuminate\Database\Seeder;

class AcciPackingListSeeder extends Seeder
{
    public function run(): void
    {
        AcciPackingList::updateOrCreate(
            ['packing_list_no' => '011'],
            [
                'packing_list_date' => '2026-07-18',
                'seller_name' => 'PAHLAWAN NOORI LTD',
                'seller_address' => "T.L NO: 1173-27 SHORANDAM INDUSTRIAL AREA KANDAHAR AFGHANISTAN.\nBENEFICIARY DETAILS: BENEFICIARY NAME: PAHLAWAN NOORI LTD\nACCOUNT NUMBER: 104502USD2341068\nBENEFICIARY BANK DETAILS: ACCOUNT WITH: AFGHAN UNITED BANK\nBANK ADDRESS: AUB BUILDING ZARGHONA MAI DAN, SHAHRIE-NOW, KABUL\nSWIFT CODE: AFGUAFKAXXX\nAUB ACCOUNT NUMBER WITH AL SALAM BANK: BH61ALSA00500951200102",
                'seller_phone' => '+93707 070 975',
                'buyer_name' => 'S.V INTERNATIONAL',
                'buyer_address' => '71 GANDHI GALI, KHARI,BAOLI DELHI- 110006( INDIA)',
                'buyer_phone' => '+919999494148',
                'buyer_gst' => '07ACPFS5791R1ZU',
                'buyer_fssai' => '13324999000209',
                'buyer_iec' => '0514045841',
                'commodity' => 'BLACK RAISINS GRADE 1',
                'quantity_cartons' => 412,
                'carton_dimensions' => '47 x 30 x 25 cm',
                'volume_per_carton' => '0.035 CBM',
                'net_weight' => 6592,
                'gross_weight' => 7004,
                'total_volume' => '14.52 CBM',
                'country_of_origin' => 'Afghanistan',
                'transport_route' => 'Via:BY AIR FROM HAMID KARZAI AIRPORT TO INDIA',
                'authorized_person' => 'PHALAWAN NOORI LTD',
            ]
        );
    }
}
