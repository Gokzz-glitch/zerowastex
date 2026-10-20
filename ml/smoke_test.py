import io
import os

os.environ.setdefault("VISION_MODEL_SOURCE", "mock")
os.environ.setdefault("VISION_SKIP_MODEL_INIT", "true")

from fastapi.testclient import TestClient
from PIL import Image

from vision_service import app


def run_smoke():
    client = TestClient(app)

    health = client.get('/health')
    assert health.status_code == 200

    classes = client.get('/classes')
    assert classes.status_code == 200
    assert 'mlp_taxonomy' in classes.json()

    image = Image.new('RGB', (120, 80), color=(200, 120, 80))
    buff = io.BytesIO()
    image.save(buff, format='JPEG')
    buff.seek(0)

    scored = client.post('/score?bin_type=dry_bin', files={'file': ('sample.jpg', buff.getvalue(), 'image/jpeg')})
    assert scored.status_code == 200
    body = scored.json()
    assert 'ai_quality_score' in body
    assert 'model_source' in body
    assert 'mlp_category' in body

    print('ML smoke test passed')


if __name__ == '__main__':
    run_smoke()
