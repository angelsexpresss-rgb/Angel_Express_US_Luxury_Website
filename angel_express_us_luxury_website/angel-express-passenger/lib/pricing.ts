export function calculateAngelExpressFare(distanceMiles: number, isStudent = false) {
  let pricingTier = "";
  let baseFareAmount = 0;
  let mileageRate = 0;

  if (distanceMiles <= 20) {
    pricingTier = "Local";
    baseFareAmount = 15;
    mileageRate = 1.5;
  } else if (distanceMiles <= 100) {
    pricingTier = "Medium";
    baseFareAmount = 25;
    mileageRate = 1.25;
  } else {
    pricingTier = "Long Distance";
    baseFareAmount = 35;
    mileageRate = 1.1;
  }

  const mileageFare = distanceMiles * mileageRate;
  const subtotal = baseFareAmount + mileageFare;
  const studentDiscount = isStudent ? subtotal * 0.2 : 0;
  const finalPrice = subtotal - studentDiscount;

  return {
    pricingTier,
    baseFareAmount,
    mileageRate,
    mileageFare,
    subtotal,
    studentDiscount,
    finalPrice,
    driverShare: finalPrice * 0.7,
    companyShare: finalPrice * 0.3,
  };
}