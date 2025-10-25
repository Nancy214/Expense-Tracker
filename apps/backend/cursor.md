Refactor the backend codebase to extract service logic from controllers into a dedicated services folder.

Current structure: Business logic is currently implemented directly inside controllers.
Target structure: Move all business logic to separate service files in a dedicated 'services' folder, while controllers should only handle request/response and delegate to services.

Steps:

1. Create a 'services' directory at the same level as the controllers directory if it doesn't exist
2. For each controller file:
    - Identify business logic sections that should be moved to a service
    - Create a corresponding service file with the same base name (e.g., UserController → UserService)
    - Move the identified business logic to appropriate methods in the service
    - Inject the service into the controller and delegate calls
    - Ensure all functionality remains exactly the same
3. Make sure all imports and exports are correctly updated
4. Maintain the same parameter signatures and return values to preserve existing behavior
5. Do not change any business logic implementation details - just relocate the code

Constraints:

-   Preserve all existing functionality exactly as is
-   Maintain the same error handling patterns
-   Keep the same validation logic
-   Ensure all tests still pass after refactoring
