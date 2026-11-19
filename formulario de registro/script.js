(function () {
  // Esta función anónima se ejecuta sola al cargarse el archivo.
  // Aisla las variables para que no formen parte del ámbito global.

  // Define una función abreviada para buscar elementos por su atributo id.
  // El parámetro id recibe el identificador del elemento HTML.
  // document.getElementById busca el elemento y devuelve su objeto DOM.
  const $ = id => document.getElementById(id);

  // Declara una lista con los identificadores de los campos que se validan.
  const fieldIds = ["email", "edad", "pass"];
  // Declara la clave que identifica los datos de las cuentas en localStorage. 
  const KEY = "club-nana-cuentas";
  // Declara una copia temporal de las cuentas para usar si localStorage falla.
  let memory = [];

  // Declara una función que lee las cuentas guardadas.
  const read = () => {
    // Intenta ejecutar la lectura dentro de un bloque protegido.
    try {
      // Obtiene el texto guardado con KEY y lo convierte de JSON a arreglo.
      // Si no existe ningún dato, devuelve un arreglo vacío con el operador ||.
      return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch {
      // Si localStorage genera un error, devuelve las cuentas guardadas en memoria.
      return memory;
    }
  };

  // Declara una función que recibe el arreglo actualizado de cuentas.
  const save = accounts => {
    // Reemplaza la copia temporal por el arreglo recibido.
    memory = accounts;
    // Intenta guardar el arreglo en el almacenamiento permanente del navegador.
    try {
      // Convierte el arreglo a texto JSON antes de almacenarlo.
      // Usa KEY para identificar estos datos dentro de localStorage.
      localStorage.setItem(KEY, JSON.stringify(accounts));
    } catch {
      // Si el almacenamiento falla, conserva los datos solamente en memory.
    }
  };

  // Declara una función que convierte bytes en una cadena hexadecimal.
  const hex = buffer =>
    // Convierte el resultado recibido en un arreglo de bytes sin signo.
    Array.from(new Uint8Array(buffer), byte =>
      // Convierte cada byte a base hexadecimal.
      // padStart agrega un cero inicial si el valor ocupa un solo carácter.
      byte.toString(16).padStart(2, "0")
    // join une todos los valores hexadecimales sin separadores.
    ).join("");

  // Declara una función asincrónica que crea un hash seguro de la contraseña.
  async function hashPassword(password) {
    // Comprueba si el navegador ofrece crypto.subtle.
    // Si no lo ofrece, devuelve una cadena vacía.
    if (!crypto?.subtle) return "";

    // Genera ocho bytes aleatorios para usar como sal.
    // Convierte esos bytes a texto hexadecimal mediante la función hex.
    const salt = hex(crypto.getRandomValues(new Uint8Array(8)));
    // Une la sal y la contraseña y convierte el texto a bytes UTF-8.
    const data = new TextEncoder().encode(salt + password);
    // Espera el cálculo de SHA-256 y guarda el resultado en digest.
    const digest = await crypto.subtle.digest("SHA-256", data);
    // Devuelve la sal y el hash separados por dos puntos.
    return `${salt}:${hex(digest)}`;
  }

  // Crea un objeto con las reglas básicas de una contraseña.
  const passwordChecks = {
    // len exige al menos ocho caracteres.
    len: password => password.length >= 8,
    // num exige al menos un carácter numérico.
    num: password => /\d/.test(password),
    // mix exige al menos una letra minúscula y una letra mayúscula.
    mix: password => /[a-z]/.test(password) && /[A-Z]/.test(password)
  };

  // Declara una función que evalúa visualmente y determina si es válida la contraseña.
  function evaluatePassword() {
    // Lee el texto actual escrito en el campo de contraseña.
    const password = $("pass").value;
    // Inicializa el contador de requisitos principales aprobados.
    let validCount = 0;

    // Recorre todos los elementos hijos del contenedor con id reqs.
    for (const item of $("reqs").children) {
      // Lee la regla indicada por data-r y la ejecuta sobre la contraseña.
      const valid = passwordChecks[item.dataset.r](password);
      // Agrega la clase ok si la regla es válida y la elimina si no lo es.
      item.classList.toggle("ok", valid);
      // Suma uno al contador cuando el requisito está cumplido.
      validCount += valid;
    }

    // Calcula el nivel general de seguridad de la contraseña.
    // Empieza en cero si el campo está vacío.
    const score = password
      // Si hay texto, suma los requisitos aprobados.
      // Luego suma un punto si hay símbolo y la contraseña tiene ocho caracteres.
      ? validCount + (/[^A-Za-z0-9]/.test(password) && password.length >= 8)
      : 0;
    // Define las etiquetas mostradas según el valor de score.
    const labels = ["sin evaluar", "débil", "regular", "buena", "fuerte"];

    // Actualiza el ancho de la barra multiplicando el nivel por 25.
    $("bar").style.width = `${score * 25}%`;
    // Cambia el color de la barra según el nivel obtenido.
    $("bar").style.background =
      score <= 1 ? "var(--err)" : score <= 2 ? "var(--pink)" : "var(--purple)";
    // Actualiza el texto visible con la etiqueta correspondiente.
    $("nivel").textContent = `Seguridad: ${labels[score]}`;

    // Devuelve verdadero únicamente si los tres requisitos principales fueron aprobados.
    return validCount === 3;
  }

  // Crea un objeto que contiene las reglas de validación de los campos.
  const rules = {
    // Declara la función de validación del correo electrónico.
    email() {
      // Lee el correo y elimina los espacios de sus extremos.
      const value = $("email").value.trim();
      // Comprueba el formato básico mediante una expresión regular.
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
        // Devuelve el mensaje que indica cómo debe ingresar el correo.
        return "Ingresá un correo válido, por ejemplo nombre@correo.com.";
      }

      // Lee las cuentas existentes y busca un correo coincidente en minúsculas.
      return read().some(account => account.email === value.toLowerCase())
        // Si encuentra una coincidencia, devuelve el mensaje de correo duplicado.
        ? "Este correo ya está registrado."
        // Si no hay coincidencia, devuelve una cadena vacía que representa éxito.
        : "";
    },

    // Declara la función de validación de la edad.
    edad() {
      // Lee la edad como texto y elimina los espacios de sus extremos.
      const value = $("edad").value.trim();
      // Si el campo está vacío, devuelve un mensaje de campo requerido.
      if (!value) return "Ingresá tu edad.";

      // Convierte el texto de la edad en un número.
      const age = Number(value);
      // Comprueba que sea entero y que esté entre cero y ciento veinte.
      if (!Number.isInteger(age) || age < 0 || age > 120) {
        // Devuelve un mensaje si el número no cumple el rango válido.
        return "Ingresá una edad válida (número entero).";
      }

      // Exige dieciocho años o más y devuelve una cadena vacía si la regla pasa.
      return age < 18 ? "Necesitás tener 18 años o más para unirte." : "";
    },

    // Declara la validación de la contraseña usando evaluatePassword.
    pass: () => evaluatePassword()
      // Si la contraseña es válida, devuelve una cadena vacía.
      ? ""
      // Si no cumple, devuelve el mensaje correspondiente.
      : "La contraseña no cumple los requisitos."
  };

  // Declara una función que valida un campo y actualiza su interfaz.
  function checkField(id) {
    // Ejecuta la función de validación correspondiente al identificador recibido.
    const error = rules[id]();
    // Escribe el mensaje de error dentro del elemento e- seguido del identificador.
    $(`e-${id}`).textContent = error;
    // Busca el contenedor .field y agrega o elimina la clase invalid.
    $(id).closest(".field").classList.toggle("invalid", !!error);
    // Actualiza aria-invalid con verdadero o falso para tecnologías de asistencia.
    $(id).setAttribute("aria-invalid", !!error);
    // Devuelve verdadero si no existe error y falso si existe.
    return !error;
  }

  // Recorre el arreglo fieldIds para registrar eventos en cada campo.
  fieldIds.forEach(id => {
    // Cuando el usuario sale del campo, ejecuta su validación.
    $(id).addEventListener("blur", () => checkField(id));
    // Cuando el usuario escribe o modifica el campo, realiza acciones adicionales.
    $(id).addEventListener("input", () => {
      // Si el campo modificado es la contraseña, actualiza su indicador visual.
      if (id === "pass") evaluatePassword();
      // Si el campo ya está marcado como inválido, vuelve a validar su contenido.
      if ($(id).closest(".field").classList.contains("invalid")) checkField(id);
    });
  });

  // Busca el botón show y escucha el evento de clic.
  $("show").addEventListener("click", function () {
    // Comprueba si el campo de contraseña está oculto.
    const reveal = $("pass").type === "password";
    // Cambia el campo a texto visible o vuelve a ocultarlo.
    $("pass").type = reveal ? "text" : "password";
    // Cambia el texto del botón a la acción opuesta que podrá realizarse.
    this.textContent = reveal ? "Ocultar" : "Mostrar";
    // Actualiza aria-pressed para indicar si el contenido está visible.
    this.setAttribute("aria-pressed", reveal);
  });

  // Busca el formulario y escucha el evento de envío.
  $("form").addEventListener("submit", async event => {
    // Cancela el envío convencional para evitar que la página se recargue.
    event.preventDefault();

    // Busca el primer campo inválido; find devuelve su identificador.
    const firstInvalid = fieldIds.find(id => !checkField(id));
    // Si existe un campo inválido, entra en este bloque.
    if (firstInvalid) {
      // Lleva el foco del teclado al campo que contiene el error.
      $(firstInvalid).focus();
      // Termina la función sin guardar el registro.
      return;
    }

    // Normaliza el correo y elimina los espacios de sus extremos.
    const email = $("email").value.trim().toLowerCase();
    // Lee nuevamente el arreglo actual de cuentas registradas.
    const accounts = read();

    // Agrega un nuevo objeto con los datos recopilados.
    accounts.push({
      // Guarda el correo normalizado.
      email,
      // Convierte la edad a número antes de almacenarla.
      edad: Number($("edad").value),
      // Espera a que la contraseña sea protegida mediante su hash.
      pass: await hashPassword($("pass").value),
      // Guarda la fecha y hora actual en formato ISO.
      fecha: new Date().toISOString()
    });
    // Guarda el arreglo actualizado y su copia temporal.
    save(accounts);

    // Construye el mensaje de confirmación con el correo y el número de socio.
    $("ok").textContent =
      `Tu cuenta ${email} quedó registrada. Sos la persona socia n.º ${accounts.length}.`;
    // Oculta el formulario que ya fue enviado.
    $("form").hidden = true;
    // Muestra el contenedor con el mensaje de registro completo.
    $("done").hidden = false;
    // Desplaza la página hasta el inicio del mensaje de confirmación.
    $("done").scrollIntoView({ block: "start" });
  });

  // Busca el botón otro y escucha el clic para iniciar otro registro.
  $("otro").addEventListener("click", () => {
    // Restablece todos los valores originales del formulario.
    $("form").reset();
    // Vuelve a calcular el indicador visual de seguridad.
    evaluatePassword();
    // Oculta nuevamente el campo de contraseña.
    $("pass").type = "password";
    // Restablece el texto del botón show.
    $("show").textContent = "Mostrar";
    // Restablece el estado aria-pressed del botón show.
    $("show").setAttribute("aria-pressed", "false");

    // Busca todos los contenedores que tengan la clase invalid.
    document.querySelectorAll(".invalid").forEach(field =>
      // Elimina la clase invalid de cada contenedor.
      field.classList.remove("invalid")
    );
    // Busca todos los elementos que tengan la clase error.
    document.querySelectorAll(".error").forEach(error =>
      // Borra el texto de cada mensaje de error.
      error.textContent = ""
    );
    // Vuelve a mostrar el formulario de registro.
    $("form").hidden = false;
    // Oculta nuevamente el mensaje de confirmación.
    $("done").hidden = true;
    // Coloca el cursor dentro del campo de correo.
    $("email").focus();
  });
})();
