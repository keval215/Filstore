from reputation import ReputationScorer

def select_best_deals(deals, preferences):
    # If deals is not a dict of deals, return empty list
    if not isinstance(deals, dict) or any(k in deals for k in ("error", "info", "tip", "s3_info")):
        return []
    scorer = ReputationScorer()
    filtered = []
    for deal_id, deal in deals.items():
        prop = deal.get('Proposal', {})
        if preferences.get('verified') and not prop.get('VerifiedDeal'):
            continue
        if preferences.get('max_price') and int(prop.get('StoragePricePerEpoch', 0)) > preferences['max_price']:
            continue
        filtered.append((deal_id, deal))
    # Rank by price and reputation
    ranked = sorted(filtered, key=lambda x: (
        int(x[1]['Proposal']['StoragePricePerEpoch']),
        -scorer.get_score(x[1]['Proposal']['Provider'])
    ))
    return ranked[:preferences.get('limit', 20)] 