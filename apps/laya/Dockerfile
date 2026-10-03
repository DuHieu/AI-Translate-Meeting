FROM python:3.11-slim

ARG TORCH_VERSION=2.14.0
RUN pip install --no-cache-dir "torch==${TORCH_VERSION}" \
      --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir "laya[serve]==0.3.20"

EXPOSE 8000

CMD ["laya-serve"]
