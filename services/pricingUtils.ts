
export const PACKAGES = [
  { label: '1 BOTTLE of 500ml @ ₦20,000', qty: 1, price: 20000 },
  { label: '2 BOTTLES of 500ml @ ₦38,000', qty: 2, price: 38000 },
  { label: '3 BOTTLES of 500ml @ ₦55,000', qty: 3, price: 55000 },
  { label: '6 BOTTLES of 500ml @ ₦90,000', qty: 6, price: 90000 },
  { label: '8 BOTTLES of 500ml @ ₦126,000', qty: 8, price: 126000 },
  { label: '10 BOTTLES of 500ml @ ₦165,000 (Get 1 Bonus)', qty: 10, price: 165000 },
  { label: '15 BOTTLES of 500ml @ ₦249,500 (Get 2 Bonus)', qty: 15, price: 249500 },
  { label: '18 BOTTLES of 500ml @ ₦300,000 (Get 3 Bonus)', qty: 18, price: 300000 },
  { label: '30 BOTTLES of 500ml @ ₦500,000 (Get 5 Bonus)', qty: 30, price: 500000 },
];

export const UDO_PACKAGES = [
  { label: '2 BOTTLES of 500ml @ ₦36,000', qty: 2, price: 36000 },
  { label: '3 BOTTLES of 500ml @ ₦55,000', qty: 3, price: 55000 },
  { label: '6 BOTTLES of 500ml @ ₦90,000', qty: 6, price: 90000 },
  { label: '8 BOTTLES of 500ml @ ₦126,000', qty: 8, price: 126000 },
  { label: '10 BOTTLES of 500ml @ ₦165,000 (Get 1 Bonus)', qty: 10, price: 165000 },
  { label: '15 BOTTLES of 500ml @ ₦249,500 (Get 2 Bonus)', qty: 15, price: 249500 },
];

export const getPackagePrice = (qty: number, agentName?: string) => {
  const isUdo = (agentName?.toLowerCase().includes('udo')) || (agentName?.toLowerCase() === 'abelchill000@gmail.com');
  
  const packageList = isUdo ? UDO_PACKAGES : PACKAGES;
  const pkg = packageList.find(p => p.qty === qty);
  
  if (pkg) return pkg.price;
  
  return qty * 20000; // Default unit price
};

export const calculateItemTotal = (item: any, agentName?: string) => {
  // Priority 1: Check if the product name/label contains a price (e.g. "Package @ ₦38,000")
  const nameToSearch = item.productName || item.packageLabel || '';
  const namePrice = nameToSearch.match(/₦([\d,]+)/);
  if (namePrice) {
    return parseInt(namePrice[1].replace(/,/g, ''));
  }

  // Priority 2: Use package pricing table
  return getPackagePrice(item.quantity, agentName);
};
