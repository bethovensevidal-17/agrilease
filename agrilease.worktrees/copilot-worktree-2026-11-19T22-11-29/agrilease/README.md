# AGRILEASE Project

Welcome to the AGRILEASE project, a comprehensive solution for managing equipment rentals and owner verifications. This project is structured into two main parts: the backend and the frontend.

## Project Structure

The project is organized as follows:

```
agrilease
├── backend
│   ├── src
│   │   ├── config
│   │   │   └── database.js          # Database configuration settings
│   │   ├── controllers
│   │   │   └── equipmentController.js # Handles equipment-related requests
│   │   ├── models
│   │   │   └── Equipment.js          # Defines the Equipment model
│   │   ├── routes
│   │   │   └── equipmentRoutes.js     # Sets up routes for equipment management
│   │   ├── services
│   │   │   └── equipmentService.js    # Contains business logic for equipment management
│   │   └── validators
│   │       └── equipmentValidator.js   # Validation functions for equipment data
│   ├── package.json                   # Backend dependencies and scripts
│   └── README.md                      # Documentation for backend setup and usage
├── frontend
│   ├── src
│   │   ├── api
│   │   │   └── equipment.js           # API calls related to equipment management
│   │   ├── components
│   │   │   ├── equipment
│   │   │   │   ├── EquipmentTable.jsx  # Displays a table of equipment
│   │   │   │   ├── EquipmentForm.jsx   # Component for submitting/editing equipment
│   │   │   │   ├── EquipmentFilters.jsx # Provides filtering options for equipment
│   │   │   │   └── EquipmentDetails.jsx # Displays detailed information about equipment
│   │   │   └── admin
│   │   │       └── Pagination.jsx      # Component for paginating the equipment list
│   │   ├── context
│   │   │   └── EquipmentContext.jsx    # Context provider for managing equipment state
│   │   ├── hooks
│   │   │   └── useEquipment.js         # Custom hook for managing equipment logic
│   │   ├── pages
│   │   │   ├── EquipmentManagement.jsx  # Main page for equipment management
│   │   │   ├── EquipmentList.jsx        # Displays the list of equipment
│   │   │   └── EquipmentDetails.jsx     # Shows detailed information about equipment
│   │   ├── styles
│   │   │   └── equipment-management.css  # CSS styles for equipment management components
│   │   ├── utils
│   │   │   └── formatters.js            # Utility functions for formatting equipment data
│   │   └── App.jsx                      # Main entry point for the frontend application
│   ├── package.json                     # Frontend dependencies and scripts
│   ├── vite.config.js                   # Configuration settings for Vite
│   └── README.md                        # Documentation for frontend setup and usage
└── README.md                            # Overall documentation for the AGRILEASE project
```

## Getting Started

To get started with the AGRILEASE project, follow these steps:

1. **Clone the Repository**: Clone this repository to your local machine.
2. **Install Dependencies**:
   - Navigate to the `backend` directory and run `npm install` to install backend dependencies.
   - Navigate to the `frontend` directory and run `npm install` to install frontend dependencies.
3. **Set Up the Database**: Configure your database settings in `backend/src/config/database.js`.
4. **Run the Application**:
   - Start the backend server by running `npm start` in the `backend` directory.
   - Start the frontend application by running `npm run dev` in the `frontend` directory.
5. **Access the Application**: Open your browser and navigate to the specified URL to access the application.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.