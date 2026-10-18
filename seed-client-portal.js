const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

// Minimal script to seed Client A and Client B for testing Phase 12

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, ".local-customer-portal-users.json");
const ACCESS_FILE = path.join(DATA_DIR, ".local-bol-company-access.json");

// Ensure dirs
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function seed() {
  const users = [
    {
      id: "client-user-A",
      customerId: "company-A",
      customerName: "Company A Ltd",
      username: "clientA",
      email: "a@companya.com",
      passwordHash: "password123",
      salt: "x",
      role: "customer_admin",
      status: "active",
      preferredLanguage: "en",
      permissions: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "client-user-B",
      customerId: "company-B",
      customerName: "Company B LLC",
      username: "clientB",
      email: "b@companyb.com",
      passwordHash: "password123",
      salt: "x",
      role: "customer_admin",
      status: "active",
      preferredLanguage: "en",
      permissions: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ];

  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

  // Seed Access Rules
  // Let's assume some dummy BOL IDs that might not exist, but will show up if they do
  const accessRules = [
    {
      id: "access-1",
      bol_id: "BOL-TEST-A",
      company_id: "company-A",
      access_role: "SHIPPER",
      can_view_tracking: true,
      can_view_documents: true,
      can_view_financials: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: "access-2",
      bol_id: "BOL-TEST-B",
      company_id: "company-B",
      access_role: "CONSIGNEE",
      can_view_tracking: true,
      can_view_documents: false,
      can_view_financials: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  fs.writeFileSync(ACCESS_FILE, JSON.stringify(accessRules, null, 2));
  console.log("Seeded Company A (clientA / password123) and Company B (clientB / password123)");
}

seed();
