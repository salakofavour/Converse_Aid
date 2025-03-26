import os
import json
import time
from dotenv import load_dotenv
from src.database import db
from src.auth import auth_service
import src.config as config

# Load environment variables
load_dotenv()

def main():
    """Test the token update functionality."""
    print("Testing token update functionality...")
    
    # Ensure required environment variables
    config.ensure_env_vars()
    
    try:
        # 1. Test direct database update
        print("\n----- Testing direct database update -----")
        test_user_id = "test-user-id"  # Replace with a real user ID for testing
        test_email = "test@example.com"  # Replace with a real email for testing
        test_access_token = f"test-token-{int(time.time())}"
        test_expires_in = int(time.time()) + 3600
        
        print(f"Updating token for user {test_user_id}, email {test_email}")
        print(f"New token: {test_access_token}")
        
        # First, get the current sender array
        fetch_result = None
        try:
            fetch_result = db.client.table('profiles').select("sender").eq("id", test_user_id).execute()
            
            if fetch_result.data and len(fetch_result.data) > 0:
                print("\nCurrent sender array:")
                sender_array = fetch_result.data[0].get('sender', [])
                print(json.dumps(sender_array, indent=2))
                
                # Find the entry for the test email
                email_found = False
                for i, sender_obj in enumerate(sender_array):
                    if sender_obj.get('email') == test_email:
                        email_found = True
                        print(f"\nFound existing entry for {test_email} at index {i}")
                        print(f"Current access_token: {sender_obj.get('access_token', 'None')}")
                        print(f"Current expires_in: {sender_obj.get('access_expires_in', 'None')}")
                        
                if not email_found:
                    print(f"\nWarning: No entry found for email {test_email}")
                    print("Test will likely fail unless the update_access_token method handles this case")
            else:
                print(f"Warning: No profile found for user_id {test_user_id}")
        except Exception as e:
            print(f"Error fetching current sender array: {str(e)}")
        
        # Now update the token
        try:
            result = db.update_access_token(test_user_id, test_email, test_access_token, test_expires_in)
            print(f"\nUpdate result: {result}")
            
            # Verify the update
            verify_result = db.client.table('profiles').select("sender").eq("id", test_user_id).execute()
            
            if verify_result.data and len(verify_result.data) > 0:
                print("\nUpdated sender array:")
                updated_sender_array = verify_result.data[0].get('sender', [])
                print(json.dumps(updated_sender_array, indent=2))
                
                # Check if the token was updated correctly
                email_found = False
                for i, sender_obj in enumerate(updated_sender_array):
                    if sender_obj.get('email') == test_email:
                        email_found = True
                        print(f"\nVerifying token update for {test_email} at index {i}")
                        
                        if sender_obj.get('access_token') == test_access_token:
                            print("✓ access_token updated successfully")
                        else:
                            print(f"✗ access_token not updated correctly. Got: {sender_obj.get('access_token')}")
                        
                        if sender_obj.get('access_expires_in') == test_expires_in:
                            print("✓ access_expires_in updated successfully")
                        else:
                            print(f"✗ access_expires_in not updated correctly. Got: {sender_obj.get('access_expires_in')}")
                
                if not email_found:
                    print(f"\n✗ No entry found for email {test_email} after update")
            else:
                print(f"✗ No profile found for user_id {test_user_id} after update")
        except Exception as e:
            print(f"Error updating token: {str(e)}")
        
        # 2. Test through auth service (optional)
        print("\n----- Testing through auth service -----")
        print("Skipping this test as it requires a valid refresh token.")
        print("To test this part, uncomment the code and provide a valid refresh token.")
        
        """
        # You would need a valid refresh token for this test
        test_refresh_token = "your-valid-refresh-token"
        
        # Create a mock response object that matches the expected format
        mock_user_data = type('obj', (object,), {
            'data': [{
                'user_id': test_user_id,
                'Job_email': test_email
            }]
        })
        
        try:
            print(f"\nRefreshing token for user {test_user_id}, email {test_email}")
            result = auth_service.refresh_access_token(test_refresh_token, mock_user_data)
            print("Token refresh successful!")
            print(f"New access_token: {result['access_token']}")
            print(f"New access_expires_in: {result['access_expires_in']}")
        except Exception as e:
            print(f"Error refreshing token: {str(e)}")
        """
        
    except Exception as e:
        print(f"Test failed with error: {str(e)}")

if __name__ == "__main__":
    main() 