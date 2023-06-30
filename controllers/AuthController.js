const bcrypt = require('bcrypt');
const User = require('../models/User');
const axios = require('axios');
const mailgun = require('mailgun-js');

const authController = {};


// Configuración de Mailgun
const mg = mailgun({
  apiKey: '55a4427486546d783bd6d5bbb57e3463-e5475b88-8633c82a',
  domain: 'sandbox744e22f185994343a2dd6bc348b3883b.mailgun.org',
});

authController.register = async (req, res) => {
  const { username, password, confirmPassword, email, 'g-recaptcha-response': captchaResponse } = req.body;

  // Verificar el código CAPTCHA
  try {
    const response = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {
      params: {
        secret: '6LeZc-AmAAAAAN0HlekWRsZf61oHxOgRxCeiqE21',
        response: captchaResponse,
      },
    });

    if (!response.data.success || response.data.score < 0.5) {
      res.render('register', { message: 'Captcha inválido. Inténtalo de nuevo.' });
      return;
    }
  } catch (error) {
    console.error('Error verifying CAPTCHA:', error);
    res.render('register', { message: 'Internal server error' });
    return;
  }

  // Resto del código para registrar al usuario
  try {
    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      res.render('register', { message: 'Nombre de usuario ya existe' });
      return;
    }

    if (password !== confirmPassword) {
      res.render('register', { message: 'Las contraseñas no coinciden' });
      return;
    }

    await User.createUser(username, password, email);
    res.render('login', { message: 'User created successfully' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.render('register', { message: 'Internal server error' });
  }
};
authController.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findByUsername(username);

    // Verificar si la cuenta está bloqueada
    if (user && user.account_locked_until && new Date() < new Date(user.account_locked_until)) {
      const remainingTime = Math.ceil((new Date(user.account_locked_until) - new Date()) / (1000 * 60)); // En minutos
      res.render('login', { message: `Cuenta bloqueada. Vuelva a intentarlo después de  ${remainingTime} minutos.` });
      return;
    }

    if (!user || !bcrypt.compareSync(password, user.password)) {
      // Incrementar el número de intentos de inicio de sesión fallidos
      if (user) {
        const loginAttempts = user.login_attempts + 1;
        await User.updateLoginAttempts(user.id, loginAttempts);

        if (loginAttempts === 2) {
          res.render('login', { message: 'Nombre de usuario y / o contraseña inválido. Un intento fallido más resultará en un bloqueo de su cuenta de 30 minutos.' });
          return;
        } else if (loginAttempts >= 3) {
          // Bloquear la cuenta por 30 minutos
          const lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos
          await User.updateAccountLock(user.id, lockedUntil);

          res.render('login', { message: 'Cuenta bloqueada durante 30 minutos debido a múltiples intentos fallidos de inicio de sesión.' });
          return;
        }
      }

      res.render('login', { message: 'Nombre de usuario y / o contraseña inválido' });
      return;
    }

    // Restablecer el número de intentos de inicio de sesión fallidos a cero
    await User.updateLoginAttempts(user.id, 0);
    // Restablecer el campo de bloqueo de cuenta a nulo
    await User.updateAccountLock(user.id, null);

    req.session.userId = user.id;
    res.redirect('/dashboard'); // Redirigir a la página de inicio de sesión exitosa
  } catch (error) {
    console.error('Error logging in:', error);
    res.render('login', { message: 'Internal server error' });
  }
};

authController.logout = (req, res) => {
  req.session.destroy(); // Destruye la sesión
  res.redirect('/login'); // Redirige a la página de inicio de sesión
};
 

authController.logout = (req, res) => {
  req.session.destroy(); // Destruye la sesión
  res.redirect('/login'); // Redirige a la página de inicio de sesión
};




module.exports = authController;
