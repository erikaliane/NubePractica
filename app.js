// index.js
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const authRoutes = require('./routes/authRoutes');

const crypto = require('crypto');

require('dotenv').config();
const path = require('path');
const mysql = require('mysql2');
const mailgun = require('mailgun-js');

const resetPasswordRoutes = require('./routes/reset-password');

const authController = require('./controllers/authController');
const User = require('./models/User');
const app = express();
const port = 3000;

const connection = mysql.createConnection({
  host : process.env.DB_HOST || 'localhost',
  user :  process.env.DB_USER || 'root',
  password:  process.env.DB_PASSWORD || '',
  database:  process.env.DB_NAME || 'lab15' , 
  port : process.env.DB_PORT || 3306
})
connection.connect((error)=>{
    
  if(error){
      console.error('El error de conexiòn es :' + error);
  }
  console.log('Conectado a la BD');
})



app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
  session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
  })
);



// Configuración de Mailgun
const mailgunConfig = {
  apiKey: process.env.MAILGUN_API_KEY,
  domain: process.env.MAILGUN_DOMAIN,
  from: process.env.MAILGUN_FROM_EMAIL,
};

const mg = mailgun(mailgunConfig);


app.use('/auth', authRoutes);

// Ruta para mostrar la vista de login

app.get('/login', (req, res) => {
  res.render('login', { message: null });
});



// Ruta para mostrar la vista de registro
app.get('/register', (req, res) => {
  res.render('register', { message: null });

});


app.get('/dashboard', async (req, res) => {
  if (!req.session.userId) {
    res.redirect('/login');
    return;
  }

  try {
    const userId = req.session.userId; // Obtener el ID del usuario desde la sesión

    // Realizar una consulta a la base de datos para obtener el usuario por su ID
    const user = await User.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    res.render('dashboard', { userid :user.id , username : user.username , email : user.email }); // Pasar el nombre de usuario a la vista
  } catch (error) {
    console.log(error);
    res.redirect('/login');
  }
});

app.get('/logout', authController.logout);



app.get('/forgot-password', (req, res) => {
  res.render('forgot-password', { success: null });
});

function saveTokenToDatabase(email, token, callback) {
  const query = 'UPDATE users SET resetToken = ? WHERE email = ?';
  connection.query(query, [token, email], (error, results) => {
    if (error) {
      console.error('Error al guardar el token en la base de datos:', error);
      return callback(error);
    }
    console.log('Token guardado en la base de datos');
    callback(null);
  });
}

app.post('/forgot-password', (req, res) => {
  const email = req.body.email;
  console.log(email);

  try {
    const token = crypto.randomBytes(32).toString('hex');

    saveTokenToDatabase(email, token, (error) => {
      if (error) {
        console.error('Error al guardar el token en la base de datos:', error);
        res.render('forgot-password', { error: 'Error al guardar el token en la base de datos' });
        return;
      }

      const resetLink = process.env.LINK + token;

      const mailOptions = {
        from: mailgunConfig.from,
        to: email,
        subject: 'Recuperación de contraseña',
        text: `Haz clic en el siguiente enlace para restablecer tu contraseña: ${resetLink}`
      };

      mg.messages().send(mailOptions, (error, body) => {
        if (error) {
          console.error('Error al enviar el correo de recuperación:', error);
          res.render('forgot-password', { error: 'Error al enviar el correo de recuperación' });
          return;
        }

        console.log('Correo de recuperación enviado');
        res.render('forgot-password', { success: 'Correo de recuperación enviado correctamente' });
      });
    });
  } catch (error) {
    console.error('Error al procesar la solicitud:', error);
    res.render('forgot-password', { error: 'Error al procesar la solicitud' });
  }
});

app.use('/reset-password', resetPasswordRoutes);

// Assuming this is your reset password route handler


app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
