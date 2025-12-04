"""
Country name to country code mapping utility.
Maps common country names to ISO 3166-1 alpha-2 country codes.
"""

# Common country names mapped to ISO 3166-1 alpha-2 codes
COUNTRY_NAME_TO_CODE = {
    # Major countries
    "united states": "US",
    "usa": "US",
    "u.s.": "US",
    "u.s.a.": "US",
    "america": "US",
    "united kingdom": "GB",
    "uk": "GB",
    "u.k.": "GB",
    "britain": "GB",
    "great britain": "GB",
    "england": "GB",
    "italy": "IT",
    "italian": "IT",
    "france": "FR",
    "french": "FR",
    "germany": "DE",
    "german": "DE",
    "spain": "ES",
    "spanish": "ES",
    "japan": "JP",
    "japanese": "JP",
    "china": "CN",
    "chinese": "CN",
    "india": "IN",
    "indian": "IN",
    "canada": "CA",
    "canadian": "CA",
    "australia": "AU",
    "australian": "AU",
    "brazil": "BR",
    "brazilian": "BR",
    "south korea": "KR",
    "korea": "KR",
    "south africa": "ZA",
    "russia": "RU",
    "russian": "RU",
    "netherlands": "NL",
    "dutch": "NL",
    "sweden": "SE",
    "swedish": "SE",
    "switzerland": "CH",
    "swiss": "CH",
    "belgium": "BE",
    "belgian": "BE",
    "austria": "AT",
    "austrian": "AT",
    "norway": "NO",
    "norwegian": "NO",
    "denmark": "DK",
    "danish": "DK",
    "finland": "FI",
    "finnish": "FI",
    "poland": "PL",
    "polish": "PL",
    "portugal": "PT",
    "portuguese": "PT",
    "greece": "GR",
    "greek": "GR",
    "ireland": "IE",
    "irish": "IE",
    "israel": "IL",
    "israeli": "IL",
    "turkey": "TR",
    "turkish": "TR",
    "mexico": "MX",
    "mexican": "MX",
    "argentina": "AR",
    "argentine": "AR",
    "chile": "CL",
    "chilean": "CL",
    "colombia": "CO",
    "colombian": "CO",
    "singapore": "SG",
    "singaporean": "SG",
    "hong kong": "HK",
    "taiwan": "TW",
    "new zealand": "NZ",
    "thailand": "TH",
    "thai": "TH",
    "indonesia": "ID",
    "indonesian": "ID",
    "malaysia": "MY",
    "malaysian": "MY",
    "philippines": "PH",
    "filipino": "PH",
    "vietnam": "VN",
    "vietnamese": "VN",
    "pakistan": "PK",
    "pakistani": "PK",
    "bangladesh": "BD",
    "bangladeshi": "BD",
    "egypt": "EG",
    "egyptian": "EG",
    "saudi arabia": "SA",
    "saudi": "SA",
    "united arab emirates": "AE",
    "uae": "AE",
    "qatar": "QA",
    "qatari": "QA",
    "kuwait": "KW",
    "kuwaiti": "KW",
    "iran": "IR",
    "iranian": "IR",
    "iraq": "IQ",
    "iraqi": "IQ",
    "ukraine": "UA",
    "ukrainian": "UA",
    "czech republic": "CZ",
    "czech": "CZ",
    "romania": "RO",
    "romanian": "RO",
    "hungary": "HU",
    "hungarian": "HU",
    "croatia": "HR",
    "croatian": "HR",
    "serbia": "RS",
    "serbian": "RS",
    "slovakia": "SK",
    "slovak": "SK",
    "slovenia": "SI",
    "slovenian": "SI",
    "bulgaria": "BG",
    "bulgarian": "BG",
    "estonia": "EE",
    "estonian": "EE",
    "latvia": "LV",
    "latvian": "LV",
    "lithuania": "LT",
    "lithuanian": "LT",
    "iceland": "IS",
    "icelandic": "IS",
    "luxembourg": "LU",
    "luxembourgish": "LU",
    "cyprus": "CY",
    "cypriot": "CY",
    "malta": "MT",
    "maltese": "MT",
}


def get_country_code_from_query(query):
    """
    Extract country code from a query string.
    Prioritizes full country names over abbreviations to avoid false matches.

    Args:
        query: The user query string

    Returns:
        Country code (2-letter ISO code) if found, None otherwise
    """
    import re
    query_lower = query.lower()

    # First, check for full country names (prioritize these to avoid false matches)
    # Sort by length (longer names first) to match "united states" before "us"
    sorted_countries = sorted(COUNTRY_NAME_TO_CODE.items(), key=lambda x: len(x[0]), reverse=True)
    for country_name, country_code in sorted_countries:
        # Use word boundaries to avoid partial matches
        pattern = r'\b' + re.escape(country_name) + r'\b'
        if re.search(pattern, query_lower):
            return country_code

    # Only check for 2-letter codes if no full country name was found
    # And only if they appear in a country-specific context (e.g., "of IT", "for US", "in FR")
    # Look for patterns like "of IT", "for US", "in FR", etc.
    country_code_pattern = r'\b(of|for|in|from)\s+([A-Z]{2})\b'
    matches = re.findall(country_code_pattern, query, re.IGNORECASE)
    if matches:
        # Return the country code from the match
        code = matches[0][1].upper()
        # Only return if it's a known country code
        if code in COUNTRY_NAME_TO_CODE.values():
            return code

    # Also check for patterns like "IT's subfields", "US's fields" but be more careful
    country_code_pattern2 = r'\b([A-Z]{2})\'?s?\s+(subfields?|fields?|topics?|research)'
    matches2 = re.findall(country_code_pattern2, query, re.IGNORECASE)
    if matches2:
        code = matches2[0][0].upper()
        # Only return if it's a known country code (not a generic abbreviation)
        if code in COUNTRY_NAME_TO_CODE.values():
            return code

    return None


def get_country_name_from_code(country_code):
    """
    Get a common country name from a country code.

    Args:
        country_code: 2-letter ISO country code

    Returns:
        Common country name if found, None otherwise
    """
    country_code = country_code.upper()
    # Reverse lookup
    for name, code in COUNTRY_NAME_TO_CODE.items():
        if code == country_code:
            return name.title()
    return None

