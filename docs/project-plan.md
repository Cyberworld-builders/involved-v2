# Involved Talent v2 Project Plan

## Pages

- Home
- Login
- Register
- Forgot Password
- Reset Password
- Verify Email
- Dashboard
- Profile
- Settings
- Notifications

- Assessments
    - List
    - Create / Edit
        - Details
            - Appearance
                - Title (text)
                - Description (text)
                - Logo (image)
                - Background Image (image)
            - Settings
                - Split Questions into Pages (boolean)
                - Number of Questions per Page (number)
                - Timed (boolean)
                - Time Limit (number)
                - Target (user)
            - Fields
                - Rich Text (text)
                    - This is used for descriptions, instructions, etc. 
                - Multiple Choice
                    - Rich Text (text)
                        - This is used for descriptions, instructions, etc. 
                    - Dimension (dimension)
                    - Anchors
                        - Name (text)
                        - Value (number)
                        - Practice (boolean)
                        - Need the ability to reverse values. This is a client-side action. For example, if the values for anchors 1-5 are 1,2,3,4,5, they should be able to click a button that updates the values in the input fields to 5,4,3,2,1. Nothing will be saved until the save button is clicked.
                - Slider
                    - Rich Text (text)
                        - This is used for descriptions, instructions, etc. 
                    - Dimension (dimension)
                    - Anchors
                        - Name (text)
                        - Value (number)
                        - Practice (boolean)
                        - Need the ability to reverse values. This is a client-side action. For example, if the values for anchors 1-5 are 1,2,3,4,5, they should be able to click a button that updates the values in the input fields to 5,4,3,2,1. Nothing will be saved until the save button is clicked.
                - ***QUESTION:*** *Should slider just be a variant of the multiple choice question?*
- Clients
    - List
    - Create / Edit
        - Details
            - Name (text)
            - Address (text)
            - Logo (image)
            - Background Image (image)
            - Primary Color (color)
            - Accent Color (color)
    - View
    - Delete
- Users
    - List
    - Create / Edit
        - Details
            - Name (text)
            - Email (email)
            - Password (password)
            - Role (role)
            - Status (status)
            - Created At (date)
            - Updated At (date)


## Other Features
- 