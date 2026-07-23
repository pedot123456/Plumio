// Shared content for the Scam Awareness Center page and the rotating
// ScamAlertBanner — single source so both stay in sync.

export const SCAMS = [
  {
    title:    'The Fake DuitNow / TNG Receipt',
    category: 'Payment Fraud',
    icon:     'receipt_long',
    scam:     "The buyer sends a screenshot of a successful DuitNow or Touch 'n Go eWallet transfer. However, the image is edited, or generated using a fake receipt app.",
    action:   'Never trust a screenshot. Do not hand over the item until you have opened your own banking app and verified that the funds are actually in your account balance.',
  },
  {
    title:    '"Keldai Akaun" (Mule Account) Trap',
    category: 'Bank Fraud',
    icon:     'account_balance',
    scam:     "The seller asks you to transfer money to a bank account, but the name on the account does not match the seller's profile name or seems to belong to a random third party or unknown company.",
    action:   "Always be suspicious if the names do not match. Before making any manual transfer, check the bank account number on PDRM's official Semak Mule website or app to see if it has been reported for fraud.",
  },
  {
    title:    "The Fake Courier (Pos Laju / J&T) SMS",
    category: 'Phishing',
    icon:     'sms',
    scam:     'Shortly after buying an item, you receive an SMS claiming to be from a courier (like J&T Express or Pos Laju) stating your parcel is stuck and you need to pay a RM 1.00 "customs clearance fee" via a provided link.',
    action:   'This is a phishing link designed to steal your FPX login or credit card details. Official couriers in Malaysia will not ask for additional clearance payments via random SMS links.',
  },
  {
    title:    'The "Overpayment" Refund Trick',
    category: 'Money Laundering',
    icon:     'currency_exchange',
    scam:     'The buyer "accidentally" transfers RM 500 instead of RM 50 for your item. They urgently ask you to transfer the RM 450 difference to a different bank account.',
    action:   'This is a money-laundering tactic. The original RM 500 was likely stolen. If you refund the money, you become part of the money trail. Tell them you will contact your bank to reverse the exact transaction.',
  },
  {
    title:    'The WhatsApp Migration',
    category: 'Social Engineering',
    icon:     'forum',
    scam:     'A buyer or seller insists on moving the conversation to WhatsApp or Telegram immediately, often claiming they "rarely open this app."',
    action:   'Stay on the platform. Scammers move to WhatsApp so their fraudulent messages and links cannot be monitored or blocked by our system.',
  },
];

export const TIPS = [
  "Received a payment screenshot? Always open your own bank app to confirm the money is there before handing over the item.",
  "Never share your banking TAC, OTP, or WhatsApp verification code with anyone. Official support will never ask for this.",
  "Transferring money manually? Check the seller's bank account on PDRM's Semak Mule portal first to ensure it hasn't been reported.",
  "Beware of buyers asking you to click a link to \"receive\" your funds. Always use standard banking channels like DuitNow QR.",
  "Scammed? Stop all communication and dial 997 immediately to reach the National Scam Response Centre (NSRC) in Malaysia.",
];
