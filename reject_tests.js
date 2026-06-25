require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

async function rejectTestUsers() {
    console.log("Attempting to REJECT test users using RPC...");

    const testUsers = [
        { email: 'payaltest@gmail.com', name: 'Payal Test', phone: '9999999999' },
        { email: 'test_rpc_9999@example.com', name: 'Test User', phone: '9999999999' },
        { email: 'test_rpc_9998@example.com', name: 'Test User 2', phone: '9999999998' },
        { email: 'adityadhotre1515@gmail.com', name: 'ADITYA DHOTRE', phone: '9730011724' },
        { email: 'vipulzirape@gmail.com', name: 'VIPUL ZIRAPE', phone: '9699896094' },
        { email: 'jangalenavnath333@gmail.com', name: 'Navnath Babasaheb Jangale', phone: '9730011724' }
    ];

    for (const user of testUsers) {
        // Prepare dummy payloads to trigger an update
        const studentRow = {
            student_id: `test_${Date.now()}`,
            full_name: user.name,
            email: user.email,
            mobile: user.phone,
            status: 'REJECTED',
            application_status: 'REJECTED'
        };

        const paymentRow = {
            application_id: studentRow.student_id,
            cet_student_id: studentRow.student_id,
            full_name: user.name,
            email: user.email,
            payment_status: 'REJECTED',
            payment_amount: 'Rs.0',
            payment_utr: 'REJECTED_MANUAL'
        };

        const body = JSON.stringify({
            p_student_row: studentRow,
            p_doc_rows: null,
            p_payment_row: paymentRow
        });

        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/submit_student_application`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: body
            });

            if (!res.ok) {
                console.error(`Failed for ${user.email}:`, await res.text());
            } else {
                console.log(`Successfully updated ${user.email} to REJECTED via RPC.`);
            }
        } catch (e) {
            console.error(e);
        }
    }
}

rejectTestUsers();
