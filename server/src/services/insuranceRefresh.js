import InsuranceProduct from '../models/InsuranceProduct.js';

/**
 * Re-verifies each insurance product's details against its official site.
 *
 * Once a week FINNOVA reaches out to every product's `officialLink` to confirm the
 * page is reachable and to stamp `lastRefreshedAt`. This keeps the catalogue honest
 * about which insurer portals are live without manual curation.
 *
 * The official sites are public marketing pages (HTML), so we don't scrape premiums;
 * instead we record the HTTP status so the UI can surface "last verified" freshness.
 *
 * @returns {Promise<{ total: number, ok: number, failed: number, refreshedAt: string }>}
 */
export const refreshAllInsurance = async () => {
  const products = await InsuranceProduct.find();
  let okCount = 0;
  let failedCount = 0;
  const refreshedAt = new Date();

  await Promise.all(
    products.map(async (product) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(product.officialLink, {
          method: 'GET',
          redirect: 'follow',
          signal: controller.signal,
          headers: { 'User-Agent': 'FINNOVA/1.0 (+https://finnova.local)' },
        });
        clearTimeout(timeout);

        product.lastRefreshedAt = refreshedAt;
        product.refreshStatus = res.ok ? 'ok' : 'unreachable';
        product.httpStatusCode = res.status;
        okCount += 1;
      } catch (err) {
        // Network/sandbox failures must never break the weekly job.
        product.lastRefreshedAt = refreshedAt;
        product.refreshStatus = 'error';
        product.httpStatusCode = null;
        failedCount += 1;
      }
      await product.save();
    })
  );

  return {
    total: products.length,
    ok: okCount,
    failed: failedCount,
    refreshedAt: refreshedAt.toISOString(),
  };
};
