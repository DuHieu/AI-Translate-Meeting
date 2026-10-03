from ipaddress import ip_address


def resolve_client_ip(
    peer_ip: str,
    forwarded_for: str | None,
    trusted_proxy_ips: set[str],
) -> str:
    """Trust one client IP only when the immediate peer is explicitly allowlisted."""
    if peer_ip not in trusted_proxy_ips or not forwarded_for or "," in forwarded_for:
        return peer_ip

    candidate = forwarded_for.strip()
    try:
        return str(ip_address(candidate))
    except ValueError:
        return peer_ip
