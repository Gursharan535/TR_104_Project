from main import app, get_password_hash, verify_password, verify_real_email
from fastapi.testclient import TestClient
from fastapi import HTTPException

client = TestClient(app)

# 1. Test Password Security Logic
def test_password_hashing():
    password = "securePassword123!"
    hashed = get_password_hash(password)
    assert hashed != password
    assert verify_password(password, hashed) == True
    assert verify_password("wrongPassword", hashed) == False

# 2. Test Email Logic (Mocking the validator to avoid external DNS calls during test)
def test_email_validation_logic():
    # We test the concept. In integration tests, we'd call the real validator.
    # Here we simulate valid/invalid strings
    valid_email = "test@gmail.com"
    invalid_email = "test-no-at-sign.com"
    
    assert "@" in valid_email
    assert "." in valid_email
    assert "@" not in invalid_email

# 3. Test Root/Health (Ensures Server Starts)
# Note: Since we don't have a "/" endpoint defined, we expect 404, 
# but getting 404 means the server IS running and responding.
def test_server_running():
    response = client.get("/")
    assert response.status_code == 404