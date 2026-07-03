# DNS Resend para Cubitat

Fecha de creacion: 2026-07-01

## Dominio

```txt
cubitat.com
```

## Estado en Resend

```txt
ID: af3dd8bf-de2f-40ca-a0c3-d9b948f466ad
Estado: not_started
Region: us-east-1
Envio: enabled
Recepcion: disabled
```

El dominio ya esta creado en Resend, pero todavia falta agregar los registros DNS en el proveedor del dominio y verificarlo.

## Registros DNS a agregar

### DKIM

```txt
Type: TXT
Name: resend._domainkey
Value: p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC0wllzNFUOqYXTb0Ctt8G7+bh4QeJlPdqzMvqo8AzghfY9xdJ/FOLSZJNMAmJgjSj0Oj6N8sYANqBcZw9DpFE71vDnWW8cAT5mnuKoOR6+/atbqJmIrRVHZK4DDoJeCnW4kDjuWYYETW+fkVfQvikDgLSh57vdkNIZzD+MpL+nCQIDAQAB
TTL: Auto
```

### SPF / MAIL FROM - MX

```txt
Type: MX
Name: send
Value: feedback-smtp.us-east-1.amazonses.com
Priority: 10
TTL: Auto
```

### SPF / MAIL FROM - TXT

```txt
Type: TXT
Name: send
Value: v=spf1 include:amazonses.com ~all
TTL: Auto
```

## Verificar dominio

Despues de agregar los DNS, esperar propagacion y ejecutar:

```powershell
cd D:\Proyectos\Cubitat\web
npx --yes resend-cli@latest domains verify af3dd8bf-de2f-40ca-a0c3-d9b948f466ad
npx --yes resend-cli@latest domains get af3dd8bf-de2f-40ca-a0c3-d9b948f466ad --json
```

El objetivo es que el estado pase de:

```txt
not_started
```

a:

```txt
verified
```

## Remitente recomendado para Supabase

Cuando el dominio este verificado:

```txt
notificaciones@cubitat.com
```

Mientras el dominio no este verificado, usar pruebas limitadas con:

```txt
onboarding@resend.dev
```

