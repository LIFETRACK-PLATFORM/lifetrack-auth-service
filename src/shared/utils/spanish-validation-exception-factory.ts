import { BadRequestException, ValidationError } from '@nestjs/common';

type ConstraintTranslator = (property: string, original: string) => string;

const CONSTRAINT_MESSAGES: Record<string, ConstraintTranslator> = {
  isNotEmpty: (property) => `${property} no debe estar vacío`,
  isString: (property) => `${property} debe ser un texto`,
  isEmail: (property) => `${property} debe ser un correo electrónico válido`,
  isArray: (property) => `${property} debe ser una lista`,
  isEnum: (property) => `${property} contiene un valor no permitido`,
  isInt: (property) => `${property} debe ser un número entero`,
  isNumber: (property) => `${property} debe ser un número`,
  isDateString: (property) => `${property} debe ser una fecha válida (ISO 8601)`,
  isStrongPassword: () =>
    'La contraseña debe tener al menos 8 caracteres, e incluir mayúsculas, minúsculas, números y símbolos',
  min: (property, original) => {
    const match = original.match(/-?\d+(\.\d+)?/);
    return match
      ? `${property} no debe ser menor que ${match[0]}`
      : `${property} está por debajo del mínimo permitido`;
  },
  minLength: (property, original) => {
    const match = original.match(/\d+/);
    return match
      ? `${property} debe tener al menos ${match[0]} caracteres`
      : `${property} es demasiado corto`;
  },
};

function translateConstraint(
  property: string,
  type: string,
  original: string,
): string {
  const translate = CONSTRAINT_MESSAGES[type];
  return translate ? translate(property, original) : `${property}: ${original}`;
}

function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): string[] {
  const messages: string[] = [];

  for (const error of errors) {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;

    if (error.constraints) {
      for (const [type, original] of Object.entries(error.constraints)) {
        messages.push(translateConstraint(path, type, original));
      }
    }

    if (error.children?.length) {
      messages.push(...flattenValidationErrors(error.children, path));
    }
  }

  return messages;
}

export function spanishValidationExceptionFactory(
  errors: ValidationError[],
): BadRequestException {
  return new BadRequestException({
    statusCode: 400,
    error: 'Solicitud incorrecta',
    message: flattenValidationErrors(errors),
  });
}
