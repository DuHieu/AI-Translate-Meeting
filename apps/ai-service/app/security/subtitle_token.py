from dataclasses import dataclass
from uuid import UUID

import jwt


WRITE_SCOPE = "subtitle:write"


class SubtitleTokenError(Exception):
    """The token is missing, invalid, or expired."""


class SubtitleTokenForbidden(SubtitleTokenError):
    """The token is valid but not authorized for the requested session."""


@dataclass(frozen=True)
class SubtitleSessionClaims:
    meeting_id: str
    participant_id: str
    participant_name: str | None = None
    source_language: str | None = None
    target_language: str | None = None
    livekit_identity: str | None = None


class SubtitleTokenValidator:
    def __init__(self, signing_key: str, issuer: str, audience: str):
        if len(signing_key) < 32:
            raise ValueError("Subtitle token signing key must be at least 32 characters.")
        self._signing_key = signing_key
        self._issuer = issuer
        self._audience = audience

    def validate(
        self,
        token: str,
        expected_meeting_id: str,
        expected_participant_id: str,
    ) -> SubtitleSessionClaims:
        if not token:
            raise SubtitleTokenError("Missing subtitle session token.")

        try:
            payload = jwt.decode(
                token,
                self._signing_key,
                algorithms=["HS256"],
                issuer=self._issuer,
                audience=self._audience,
                options={
                    "require": [
                        "sub",
                        "meetingId",
                        "participantId",
                        "scope",
                        "iss",
                        "aud",
                        "exp",
                        "nbf",
                    ]
                },
                leeway=5,
            )
        except jwt.InvalidTokenError as exc:
            raise SubtitleTokenError("Invalid subtitle session token.") from exc

        token_meeting_id = self._canonical_uuid(payload.get("meetingId"))
        token_participant_id = self._canonical_uuid(payload.get("participantId"))
        subject = self._canonical_uuid(payload.get("sub"))
        requested_meeting_id = self._canonical_uuid(expected_meeting_id)
        requested_participant_id = self._canonical_uuid(expected_participant_id)

        if payload.get("scope") != WRITE_SCOPE:
            raise SubtitleTokenForbidden("Subtitle write scope is required.")

        if token_participant_id != subject:
            raise SubtitleTokenForbidden("Participant binding is invalid.")

        if token_meeting_id != requested_meeting_id or token_participant_id != requested_participant_id:
            raise SubtitleTokenForbidden("Subtitle session binding does not match the request.")

        participant_name = payload.get("participantName") or payload.get("displayName")
        if participant_name is not None and not isinstance(participant_name, str):
            participant_name = None
        source_language = payload.get("sourceLanguage")
        if source_language is not None and not isinstance(source_language, str):
            source_language = None
        target_language = payload.get("targetLanguage")
        if target_language is not None and not isinstance(target_language, str):
            target_language = None
        livekit_identity = payload.get("liveKitIdentity")
        if (
            not isinstance(livekit_identity, str)
            or not livekit_identity.strip()
            or len(livekit_identity) > 128
        ):
            livekit_identity = None

        return SubtitleSessionClaims(
            meeting_id=token_meeting_id,
            participant_id=token_participant_id,
            participant_name=participant_name,
            source_language=source_language,
            target_language=target_language,
            livekit_identity=livekit_identity,
        )

    @staticmethod
    def _canonical_uuid(value: object) -> str:
        try:
            return str(UUID(str(value)))
        except (TypeError, ValueError, AttributeError) as exc:
            raise SubtitleTokenError("Invalid session identifier.") from exc
