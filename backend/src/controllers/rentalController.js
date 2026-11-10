
const db = require('../db');

exports.listMine = async (req, res) => {
  try {
    const farmerId = req.user.id;

    const [rentals] = await db.query(
      `SELECT
        rr.id,
        rr.equipment_id,
        rr.start_date,
        rr.end_date,
        rr.total_amount,
        rr.status,
        rr.created_at,
        e.equipment_name,
        e.brand_model,
        e.location,
        e.rental_rate,
        e.rate_type
      FROM rental_requests rr
      LEFT JOIN equipment e
        ON rr.equipment_id = e.id
      WHERE rr.farmer_id = ?
      ORDER BY rr.created_at DESC`,
      [farmerId]
    );

    res.json({
      success: true,
      data: rentals
    });

  } catch (error) {
    console.error('List farmer rentals error:', error);

    res.status(500).json({
      success: false,
      error: 'Hindi makuha ang rental records.'
    });
  }
};
