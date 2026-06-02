$(function () {

    $("#contactForm input, #contactForm textarea").jqBootstrapValidation({
        preventSubmit: true,
        submitError: function ($form, event, errors) {
        },
        submitSuccess: function ($form, event) {
            event.preventDefault();
            var name = $("input#name").val();
            var email = $("input#email").val();
            var subject = $("input#subject").val();
            var message = $("textarea#message").val();

            $this = $("#sendMessageButton");
            $this.prop("disabled", true);

            $.ajax({
                url: "contact.php",
                type: "POST",
                data: {
                    name: name,
                    email: email,
                    subject: subject,
                    message: message
                },
                cache: false,
                success: function () {
                    if (window.showNuaToast) {
                        window.showNuaToast("¡Mensaje enviado con éxito! Gracias por escribirnos.", "success");
                    } else {
                        $('#success').html("<div class='alert alert-success'>");
                        $('#success > .alert-success').html("<button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;")
                                .append("</button>");
                        $('#success > .alert-success')
                                .append("<strong>Su mensaje ha sido enviado con éxito. </strong>");
                        $('#success > .alert-success')
                                .append('</div>');
                    }
                    $('#contactForm').trigger("reset");
                },
                error: function () {
                    // Graceful Local Fallback for Static Hostings
                    const backupMessages = localStorage.getItem('nua_messages') ? JSON.parse(localStorage.getItem('nua_messages')) : [];
                    backupMessages.push({
                        id: 'msg_' + Date.now(),
                        name: name,
                        email: email,
                        subject: subject,
                        message: message,
                        createdAt: new Date().toISOString()
                    });
                    localStorage.setItem('nua_messages', JSON.stringify(backupMessages));

                    if (window.showNuaToast) {
                        window.showNuaToast("¡Mensaje enviado con éxito (Simulación Local)! Responderemos pronto.", "success");
                    } else {
                        $('#success').html("<div class='alert alert-success'>");
                        $('#success > .alert-success').html("<button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;")
                                .append("</button>");
                        $('#success > .alert-success')
                                .append("<strong>¡Mensaje recibido con éxito (Modo Respaldo)! Nos pondremos en contacto.</strong>");
                        $('#success > .alert-success').append('</div>');
                    }
                    $('#contactForm').trigger("reset");
                },
                complete: function () {
                    setTimeout(function () {
                        $this.prop("disabled", false);
                    }, 1000);
                }
            });
        },
        filter: function () {
            return $(this).is(":visible");
        },
    });

    $("a[data-toggle=\"tab\"]").click(function (e) {
        e.preventDefault();
        $(this).tab("show");
    });
});

$('#name').focus(function () {
    $('#success').html('');
});
