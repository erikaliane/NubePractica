const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const db = require('../config/db');
const mailgun = require('mailgun-js');



const mailgunConfig = {
  apiKey: process.env.MAILGUN_API_KEY,
  domain: process.env.MAILGUN_DOMAIN,
  from: process.env.MAILGUN_FROM_EMAIL,
};
// Ruta para mostrar el formulario de restablecimiento de contraseña
router.get('/:token', async (req, res) => {
  try {
    const token = req.params.token;

    // Buscar el usuario por el token de restablecimiento de contraseña
    const user = await User.findOne({ resetToken: token });

    if (!user) {
      throw new Error('Invalid or expired token');
    }

    res.render('reset-password', { token, success: '', error: '' });
  } catch (error) {
    console.error(error);
    res.render('reset-password', { token: '', error: 'Invalid or expired token' });
  }
});

// Ruta para procesar el formulario de restablecimiento de contraseña
// Ruta para procesar el formulario de restablecimiento de contraseña
router.post('/:token', async (req, res) => {
    try {
      const token = req.params.token;
      const newPassword = req.body.newPassword;
  
      // Buscar el usuario por el token de restablecimiento de contraseña
      const user = await User.findOne({ resetToken: token });
  
      if (!user) {
        throw new Error('Invalid or expired token');
      }
  
      // Actualizar la contraseña del usuario en la base de datos
      const saltRounds = 10;
      const hashedPassword = bcrypt.hashSync(newPassword, saltRounds);
  
      const updateQuery = 'UPDATE users SET password = ?, resetToken = NULL WHERE id = ?';
      const updateValues = [hashedPassword, user.id];
  
      db.query(updateQuery, updateValues, (error, result) => {
        if (error) {
          throw error;
        }
  
            // Enviar correo electrónico de confirmación
      const mg = mailgun(mailgunConfig);
      const emailData = {
        from: mailgunConfig.from,
        to: user.email,
        subject: 'Contraseña actualizada con éxito',
        text: '¡Tu contraseña ha sido actualizada exitosamente!',
      };

      mg.messages().send(emailData, (error, body) => {
        if (error) {
          console.error('Error al enviar el correo electrónico:', error);
        } else {
          console.log('Correo electrónico de confirmación enviado:', body);
        }
      });

      res.render('login', { message: '', success: 'Password reset successfully', error: '' });
    });
    } catch (error) {
      console.error(error);
      res.render('reset-password', { token: '', error: 'Invalid or expired token', success: '' });
    }
  });
  
module.exports = router;
