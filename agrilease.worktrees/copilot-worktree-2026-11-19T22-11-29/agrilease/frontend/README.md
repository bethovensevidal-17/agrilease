# AGRILEASE Frontend

This README file provides an overview of the frontend setup and usage for the AGRILEASE project, specifically focusing on the Equipment Management module.

## Project Structure

The frontend is organized into several directories:

- **src**: Contains all the source code for the frontend application.
  - **api**: API calls related to equipment management.
  - **components**: Reusable React components for displaying and managing equipment.
    - **equipment**: Components specific to equipment management.
    - **admin**: Components for administrative functions, such as pagination.
  - **context**: Context API for managing global state related to equipment.
  - **hooks**: Custom hooks for encapsulating equipment-related logic.
  - **pages**: Page components that serve as views for different routes.
  - **styles**: CSS styles for the application.
  - **utils**: Utility functions for data formatting.
  - **App.jsx**: Main entry point for the application.

## Installation

To set up the frontend, follow these steps:

1. Navigate to the `frontend` directory:
   ```
   cd frontend
   ```

2. Install the dependencies:
   ```
   npm install
   ```

## Running the Application

To start the development server, run the following command in the `frontend` directory:

```
npm run dev
```

This will start the Vite development server, and you can access the application at `http://localhost:3000`.

## Features

- **Equipment Management**: Users can view, add, edit, and delete equipment listings.
- **Filtering**: Users can filter equipment based on various criteria.
- **Responsive Design**: The application is designed to be responsive and user-friendly.

## Contributing

Contributions to the AGRILEASE project are welcome. Please follow the standard Git workflow for contributing to the project.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.